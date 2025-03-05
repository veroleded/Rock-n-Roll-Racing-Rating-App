export function getPercentage(arg1: number, arg2: number) {
  const result = (arg1 * arg2) / 100;
  console.log('getPercentage', { arg1, arg2, result });
  return arg2 < 0 ? -result : result;
}

export function getInverseCommonValue(...args: number[]) {
  return Number(args.reduce((acc, curr) => acc + 1 / curr, 0).toFixed(3));
}
