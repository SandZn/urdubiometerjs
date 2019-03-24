'use strict'

module.exports = class GraphParser {
  /**
    * Graph-based parser.
    * @constructor
    * @param {object} settings UrduBioMeter graph parser serialization
    * @return {object}
    */
  constructor (settings) {
    // jsonSettings = require('../src/settings.json')
    this.graph = settings['_graph']
    this.onmatchRules = settings['_onmatch_rules'].map(function (x) {
      return {
        prevClasses: x[0],
        nextClasses: x[1],
        production: x[2]
      }
    })
    this.onmatchRules_lookup = settings['_onmatch_rules_lookup']
    this.rules = settings['_rules'].map(function (x) {
      return {
        production: x[0],
        prevClasses: x[1],
        prevTokens: x[2],
        tokens: x[3],
        nextTokens: x[4],
        nextClasses: x[5],
        cost: x[6]
      }
    })
    this.tokenizer = new RegExp(settings['_tokenizer_pattern'], 'g')
    this.tokens = settings['_tokens']
    var x = settings['_whitespace']
    this.whitespace = {
      default: x[0],
      tokenClass: x[1],
      consolidate: x[2]
    }
  };

  /**
   * Handle value error during parse.
   * @param {string} message Error message.
   */
  valueError (message) {
    console.log(message)
  }

  /**
   * @param {string} input string to tokenize
   * @return {string[]} list of tokens
   */
  tokenize (input) {
    var self = this
    var tokens = []
    var matches = [self.whitespace.default]
    var _matches = []
    var lastIndex = 0
    var prevWhitespace = false
    var isWhitespace = function (token) {
      return self.tokens[token].includes(self.whitespace.tokenClass)
    }
    var m
    while ((m = self.tokenizer.exec(input)) !== null) {
      _matches.push(m)
      matches.push(m[1])
      if (m.index !== lastIndex) {
        self.valueError('Unrecognized token at pos ' + lastIndex + ' of ' + input)
      }
      lastIndex = _matches[_matches.length - 1].index +
                   _matches[_matches.length - 1][1].length
    }
    if (matches.length === 1) {
      self.valueError('Unrecognized token at pos 0 of ' + input)
      return []
    }
    for (var i = 0; i < matches.length; i++) {
      var token = matches[i]
      if (isWhitespace(token)) {
        if (prevWhitespace && self.whitespace.consolidate) {
          continue
        } else {
          prevWhitespace = true
        }
      } else {
        prevWhitespace = false
      }
      tokens.push(token)
    }
    if (self.whitespace.consolidate) {
      while (isWhitespace(tokens[tokens.length - 1])) {
        tokens.pop()
      }
    }
    tokens.push(self.whitespace.default)
    if (lastIndex !== input.length) {
      self.ValueError(
        'Unrecognizable input at pos ' + lastIndex +
          ' of ' + input
      )
    }
    return tokens
  }

  /**
   * @param {number} startIdx index of token to start match at
   * @param {[]} constraintVal
   * @param {boolean} checkPrev
   * @param {boolean} checkNext
   * @param {boolean} byClass
   * @return {boolean}
   */
  matchTokens (startIdx, constraintVal, checkPrev, checkNext, byClass) {
    var tokens = this._input_tokens
    if (checkPrev && startIdx < 0) {
      return false
    }
    if (checkNext && startIdx + constraintVal.length > tokens.length) {
      return false
    }
    for (var i = 0; i < constraintVal.length; i++) {
      if (byClass) {
        if (!this.tokens[tokens[startIdx + i]].includes(constraintVal[i])) {
          return false
        }
      } else if (tokens[startIdx + i] !== constraintVal[i]) {
        return false
      }
    }
    return true
  }

  /**
   * @param source
   * @param target
   * @param {number} tokenIdx
   * @return {boolean}
   */
  matchConstraints (source, target, tokenIdx) {
    var self = this
    var targetEdge = self.graph.edge[source][target]
    var constraints = targetEdge['constraints']

    if (!constraints) {
      return true
    }

    var constraintVal, prevTokens, nextTokens, numTokens, startAt

    for (var constraintType in constraints) {
      constraintVal = constraints[constraintType]
      if (constraintType === 'prev_tokens') {
        numTokens = self.rules[self.graph.node[target]['rule_key']].tokens.length
        startAt = tokenIdx
        startAt -= numTokens
        startAt -= constraintVal.length
        if (!self.matchTokens(startAt, constraintVal, true, false, false)) {
          return false
        }
      } else if (constraintType === 'next_tokens') {
        startAt = tokenIdx
        if (!self.matchTokens(startAt, constraintVal, false, true, false)) {
          return false
        }
      } else if (constraintType === 'prev_classes') {
        numTokens = self.rules[self.graph.node[target]['rule_key']].tokens.length
        startAt = tokenIdx
        startAt -= numTokens
        prevTokens = constraints['prev_tokens']
        if (prevTokens) {
          startAt -= prevTokens.length
        }
        startAt -= constraintVal.length
        if (!this.matchTokens(startAt, constraintVal, true, false, true)) {
          return false
        }
      } else if (constraintType === 'next_classes') {
        startAt = tokenIdx
        nextTokens = constraints['next_tokens']
        if (nextTokens) {
          startAt += nextTokens.length
        }
        if (!this.matchTokens(startAt, constraintVal, false, true, true)) {
          return false
        }
      }
    }
    return true
  }

  /**
  * @param {number} tokenIdx
  * @param {boolean} matchAll
  * @return {number|number[]}
  */
  matchAt (tokenIdx, matchAll) {
    if (matchAll) {
      var matches = []
    }
    var self = this
    var tokens = self._input_tokens
    var graph = self.graph
    var stack = []
    var appendChildren = function (nodeKey, tokenIdx) {
      var children = null
      var orderedChildren = graph.node[nodeKey]['ordered_children']
      var childKey, rulesKeys, rulesKey

      if (orderedChildren) {
        children = orderedChildren[tokens[tokenIdx]]
        if (children) {
          for (var i = children.length; i >= 0; i--) {
            childKey = children[i]
            /* stack (LIFO) from right side */
            stack.push([childKey, nodeKey, tokenIdx])
          }
        } else {
          rulesKeys = orderedChildren['__rules__']
          if (rulesKeys) {
            for (var j = rulesKeys.length; j >= 0; j--) {
              rulesKey = rulesKeys[j]
              stack.push([rulesKey, nodeKey, tokenIdx])
            }
          }
        }
      }
    }

    appendChildren(0, tokenIdx)

    while (stack.length > 0) {
      var x = stack.pop()
      var nodeKey = x[0]
      var parentKey = x[1]
      tokenIdx = x[2]
      var currNode = graph.node[nodeKey]

      if (currNode['accepting'] &&
        self.matchConstraints(parentKey, nodeKey, tokenIdx)) {
        if (matchAll) {
          matches.append(currNode['rule_key'])
        } else {
          return currNode['rule_key']
        }
        continue
      } else {
        if (tokenIdx < tokens.length - 1) {
          tokenIdx += 1
        }
        appendChildren(nodeKey, tokenIdx)
      }
    } if (matchAll) {
      return matches
    } else {
      self.ValueError(
        'Could not match token ' + tokens[tokenIdx] +
        ' at pos ' + tokenIdx +
        ' in ' + tokens
      )
    }
  }

  /**
  * @param {string} input
  * @return {string}
  */
  parse (input) {
    var self = this
    var tokens = self.tokenize(input)
    var output = ''
    var tokenIdx = 1
    var currMatchRules, prevToken, currToken, currTokenRules, tokensMatched,
      ruleKey, rule
    self._input_tokens = tokens
    self._ruleKeys = []
    while (tokenIdx < tokens.length - 1) {
      ruleKey = self.matchAt(tokenIdx)
      rule = self.rules[ruleKey]
      tokensMatched = rule.tokens
      self._ruleKeys.push(ruleKey)
      if (self.onmatchRules) {
        currMatchRules = null
        prevToken = tokens[tokenIdx - 1]
        currToken = tokens[tokenIdx]
        currTokenRules = self.onmatchRules_lookup[currToken]
        if (currTokenRules) {
          currMatchRules = currTokenRules[prevToken]
        }
        if (currMatchRules) {
          for (var j = 0; j < currMatchRules.length; j++) {
            var onmatchIdx = currMatchRules[j]
            var onmatch = self.onmatchRules[onmatchIdx]
            if (self.matchTokens(
              tokenIdx - onmatch.prevClasses.length,
              onmatch.prevClasses,
              true, false, true
            ) && self.matchTokens(
                tokenIdx,
                onmatch.nextClasses,
                false, true, true
              )) {
              output += onmatch.production
              break
            }
          }
        }
      }
      output += rule.production
      tokenIdx += tokensMatched.length
    }
    return output
  }
}
