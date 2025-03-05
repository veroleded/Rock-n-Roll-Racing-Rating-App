export function getPercentage(arg1: number, arg2: number) {
  return (arg1 * arg2) / 100;
}

export function getInverseCommonValue(...args: number[]) {
  return args.reduce((acc, curr) => acc + 1 / curr, 0);
}
