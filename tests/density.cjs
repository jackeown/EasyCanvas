const assert = require('node:assert/strict');
const {gaussianKDE} = require('../easyCanvasDensity.js');
const integrate = curve => curve.xs.slice(1).reduce((sum,x,i) => sum +
    (x-curve.xs[i]) * (curve.ys[i]+curve.ys[i+1])/2, 0);
const standard = gaussianKDE([0], {bandwidth:1, points:201});
assert.equal(standard.xs[0], -3);
assert.equal(standard.xs.at(-1), 3);
assert.ok(Math.abs(standard.ys[100] - 1/Math.sqrt(2*Math.PI)) < 1e-12);
assert.ok(Math.abs(integrate(standard)-0.9973) < 0.0001, 'A unit Gaussian has approximately unit area');
const mixture = gaussianKDE([-1,1], {bandwidth:.5});
assert.ok(integrate(mixture) > .998 && integrate(mixture) < 1);
for(let i=0;i<mixture.ys.length;i++) assert.ok(Math.abs(mixture.ys[i]-mixture.ys.at(-i-1)) < 1e-12);
const tight = gaussianKDE([0], {bandwidth:.25});
assert.ok(tight.ys[100] > standard.ys[100], 'Narrower kernels have a taller peak');
for(const values of [[5],[5,5,5],[0,0,0],[1,2,3,4]]) {
    const curve=gaussianKDE(values);
    assert.ok(Number.isFinite(curve.bandwidth) && curve.bandwidth > 0);
    assert.ok(curve.ys.every(Number.isFinite));
}
const bounded=gaussianKDE([0,1], {bandwidth:.3,range:[0,1]});
assert.equal(bounded.xs[0],0);assert.equal(bounded.xs.at(-1),1);
assert.ok(integrate(bounded)<1,'Clipping the curve does not renormalize away Gaussian tails');
for(const bandwidth of [0,-1,Infinity,NaN]) assert.throws(()=>gaussianKDE([1,2],{bandwidth}), /bandwidth/);
for(const points of [0,1,15,2049,20.5]) assert.throws(()=>gaussianKDE([1,2],{points}), /kdePoints/);
assert.deepEqual(gaussianKDE([]).xs,[]);
console.log('PASS: Gaussian KDE normalization, symmetry, smoothing, constant samples and input validation.');
