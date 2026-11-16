// Gaussian kernel density estimate. Computed once per data/settings change.
function gaussianKDE(values, {bandwidth, points = 201, range} = {}) {
    if (!Number.isInteger(points) || points < 16 || points > 2048) {
        throw new RangeError('kdePoints must be an integer from 16 to 2048');
    }
    if (!values.length) return {xs:[], ys:[], bandwidth:0};
    const sorted = [...values].sort((a, b) => a - b);
    if (bandwidth === undefined) {
        let mean = 0, sum = 0;
        values.forEach((value, i) => {
            const delta = value - mean;
            mean += delta / (i + 1);
            sum += delta * (value - mean);
        });
        const deviation = Math.sqrt(Math.max(0, sum / Math.max(1, values.length - 1)));
        const quantile = fraction => {
            const index = (sorted.length - 1) * fraction;
            const lower = Math.floor(index);
            return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
        };
        const robust = (quantile(0.75) - quantile(0.25)) / 1.34;
        const scale = deviation > 0 && robust > 0 ? Math.min(deviation, robust) : deviation ||
            Math.max(1, Math.abs(mean)) * 0.1;
        bandwidth = 0.9 * scale * values.length ** -0.2;
    }
    if (!Number.isFinite(bandwidth) || bandwidth <= 0) throw new RangeError('bandwidth must be a positive finite number');
    const min = range?.[0] ?? sorted[0] - 3 * bandwidth;
    const max = range?.[1] ?? sorted.at(-1) + 3 * bandwidth;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(max - min)) {
        throw new RangeError('KDE range must contain two increasing finite bounds');
    }
    const xs = Array.from({length:points}, (_, i) => min + (max - min) * i / (points - 1));
    const normalizer = values.length * bandwidth * Math.sqrt(2 * Math.PI);
    const ys = xs.map(x => {
        let sum = 0;
        for (const value of values) sum += Math.exp(-0.5 * ((x - value) / bandwidth) ** 2);
        return sum / normalizer;
    });
    return {xs, ys, bandwidth};
}

module.exports = {gaussianKDE};
