export function getPercentage(arg1: number, arg2: number) {
  const result = (arg1 * arg2) / 100;
  return arg2 < 0 ? -result : result;
}

export function getInverseCommonValue(...args: number[]) {
  return args.reduce((acc, curr) => acc + 1 / curr, 0);
}
