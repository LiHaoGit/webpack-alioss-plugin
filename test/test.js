var simple = require('../src/forTest')
var expect = require('expect.js')

describe('示例', function () {
  it('should return 6', function () {
    expect(simple.forTest(2, 3)).to.equal(6)
  })
  it('should return 0', function () {
    expect(simple.forTest(1000, 0)).to.equal(0)
  })
})
