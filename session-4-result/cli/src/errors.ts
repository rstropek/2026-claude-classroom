export const EXIT_FAILURE = 1;
/** Same code gh uses when authentication is required. */
export const EXIT_AUTH = 4;

export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = EXIT_FAILURE,
  ) {
    super(message);
  }
}
