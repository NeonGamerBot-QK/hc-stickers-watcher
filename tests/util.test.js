// test my util funcs so they actually work
const { setupDB, getStickers, diffStartAndEnd, formatPercent, chunk, calculatePercent, getDiffOnProps, diff } = require("../src/utils");

test("getStickers", async () => {
    expect(await getStickers()).toBeTruthy();
})
test('diffStartAndEnd', () => {
    expect(diffStartAndEnd(10, 20)).toBe("Diff (S/E) is (10) `50%`");
})
test('formatPercent', () => {
    expect(formatPercent(10)).toBe("10%");
})
test('chunk', () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3)).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
})
test('calculatePercent', () => {
    expect(calculatePercent(10, 20)).toBe(50);
})
test('getDiffOnProps', () => {
    expect(getDiffOnProps(10, 20)).toBe("diff 10");
})
test('diff', () => {
    expect(diff({name: "test", sku: "test"}, {name: "test", sku: "test"})).toEqual([]);
})