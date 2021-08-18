export class Random {
  next() {
    return this.float() * Number.MAX_SAFE_INTEGER;
  }
  int(max, min = 0) {
    if (max) {
      return (this.float() * (max - min) + min) | 0;
    } else {
      return this.next() | 0;
    }
  }
  float() {
    return Math.random();
  }
  roll(n = 1, sides = 6) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += this.int(sides) + 1;
    }
    return total;
  }
  choose(array) {
    return array[this.int(array.length)];
  }
  // lots is an Array of [option, weight]
  // optional sum of weights for perf
  weighted(lots, sum) {
    if (!sum) {
      sum = 0;
      for (let option of lots) {
        sum += option.weight || 1;
      }
    }
    let roll = this.int(sum);
    let total = 0;
    for (let option of lots) {
      total += option.weight || 1;
      if (roll < total) return option;
    }
  }
}

// garbage but servicable prng
export class PRNG extends Random {
  constructor(seed = 1) {
    super();
    this._seed = seed % 2147483647;
    if (this._seed <= 0) this._seed += 2147483646;
  }
  next() {
    return (this._seed = (this._seed * 16807) % 2147483647);
  }
  float() {
    return (this.next() - 1) / 2147483646;
  }
}

// L-System generation
export class LSystem {
  constructor({ rules, rng, seed } = {}) {
    if (rng) {
      this.rng = rng;
    } else if (seed) {
      this.rng = new PRNG(seed);
    } else {
      this.rng = new Random();
    }
    this.rules = rules;
  }

  generation(input) {
    let output = "";
    for (let symbol of input) {
      let matchingRules = this.rules.filter(r => r.symbol === symbol);
      if (matchingRules.length) {
        // pick one matching rule
        output += this.rng.weighted(matchingRules).output;
      } else {
        // pass through
        output += symbol;
      }
    }
    return output;
  }

  iterate(input) {
    let output;
    let pos = this.rng.int(input.length);
    let symbol = input[pos];
    let matchingRules = this.rules.filter(r => r.symbol === symbol);
    if (matchingRules.length) {
      // pick one matching rule
      output = this.rng.weighted(matchingRules).output;
    } else {
      // pass through
      output = symbol;
    }
    return input.slice(0, pos) + output + input.slice(pos + 1);
  }
}
