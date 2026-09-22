import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import OpenAI from 'openai';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { scenarios, type Scenario } from './scenarios.js';

const STRUCTURED_MODEL = 'openai/gpt-5.6-terra';
const JEV_MODEL = '~typesafe/jev-latest';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY is not set. Copy .env.example to .env and put your OpenRouter key in it.');
  process.exit(1);
}

// Both models are served by OpenRouter, so both clients use the same key.
const openai = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' });
const jev = new TypeSafeClient({ apiKey, baseURL: 'https://openrouter.ai/api' });

/** Run a call and report how long it took. */
async function timed<T>(call: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await call();
  return { result, ms: Math.round(performance.now() - start) };
}

/** Probabilities, confidences and scores are all printed with two decimals. */
const p = (n: number) => n.toFixed(2);
/** OpenRouter reports the price of a call in USD; the SDKs do not type it. */
const cost = (usage: unknown) => {
  const value = (usage as { cost?: number } | undefined)?.cost;
  return value === undefined ? 'unknown' : `$${value.toFixed(6)}`;
};

async function compare(scenario: Scenario, text: string) {
  const [structured, typed] = await Promise.all([
    timed(() =>
      openai.responses.create({
        model: STRUCTURED_MODEL,
        instructions: scenario.structured.instructions,
        input: text,
        text: { format: scenario.structured.format },
      }),
    ),
    timed(() => jev.systemOne({ model: JEV_MODEL, state: text, questions: scenario.jev })),
  ]);

  console.log(`\nStructured output (${STRUCTURED_MODEL})`);
  console.log(JSON.stringify(JSON.parse(structured.result.output_text), null, 2));
  const su = structured.result.usage;
  const reasoning = su?.output_tokens_details?.reasoning_tokens;
  console.log(
    `  ${structured.ms} ms | ${su?.input_tokens} in / ${su?.output_tokens} out` +
      `${reasoning ? ` (${reasoning} reasoning)` : ''} | ${cost(su)}`,
  );

  console.log(`\nJev (${JEV_MODEL})`);
  for (const [name, answer] of Object.entries(typed.result.answers)) {
    if (answer.type === 'choice') {
      console.log(`  ${name}: ${answer.choice} (confidence ${p(answer.confidence)})`);
      for (const [label, probability] of Object.entries(answer.probabilities)) {
        console.log(`      ${label}: ${p(probability)}`);
      }
    } else if (answer.type === 'score') {
      console.log(`  ${name}: ${p(answer.score)} (confidence ${p(answer.confidence)})`);
      for (const [level, probability] of Object.entries(answer.probabilities)) {
        console.log(`      ${level}: ${p(probability)}  ${String(answer.legend[Number(level)])}`);
      }
    } else {
      console.log(`  ${name}: yes ${p(answer.noul)}`);
    }
  }
  const ju = typed.result.usage;
  console.log(`  ${typed.ms} ms | ${ju.input_tokens} in / ${ju.output_tokens} out | ${cost(ju)}`);
}

const rl = createInterface({ input: stdin, output: stdout });
try {
  while (true) {
    console.log('\nScenarios:');
    scenarios.forEach((s, i) => console.log(`  ${i + 1} = ${s.name}`));
    const pick = (await rl.question('Scenario (empty or q quits): ')).trim();
    if (pick === '' || pick.toLowerCase() === 'q') break;

    const scenario = scenarios[Number(pick) - 1];
    if (!scenario) {
      console.log('No such scenario.');
      continue;
    }

    console.log(`\nInputs for ${scenario.name}:`);
    scenario.inputs.forEach((i, idx) => console.log(`  ${idx + 1} (${i.label}): ${i.text.slice(0, 70)}…`));
    console.log(`  ${scenario.inputs.length + 1} = custom`);
    const which = (await rl.question('Input: ')).trim();

    let text: string;
    if (which === String(scenario.inputs.length + 1)) {
      text = (await rl.question('Your todo: ')).trim();
    } else {
      const input = scenario.inputs[Number(which) - 1];
      if (!input) {
        console.log('No such input.');
        continue;
      }
      text = input.text;
    }
    if (!text) {
      console.log('Empty input.');
      continue;
    }

    await compare(scenario, text);
  }
} finally {
  rl.close();
}
