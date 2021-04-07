import calc
from pyteal import *
from random import randint
import sys

def eval_teal(code):
    stack = []
    slots = [0 for _ in range(256)]
    max_int = 2**64
    size = 0

    lines = code.splitlines()
    for nr, line in enumerate(lines):
        if line.startswith('#'):
            continue

        size += 1

        if line == 'dup':
            x = stack[-1]
            stack.append(stack[-1])
        elif line == 'dup2':
            x = stack[-2], stack[-1]
            stack.extend(x)
        elif line == 'pop':
            stack.pop()
        elif line == 'mulw':
            b = stack.pop()
            a = stack.pop()
            ab = a * b
            x = ab // max_int, ab % max_int
            stack.extend(x)
        elif line == 'addw':
            b = stack.pop()
            a = stack.pop()
            ab = a + b
            x = ab // max_int, ab % max_int
            stack.extend(x)
        elif line == '/':
            b = stack.pop()
            a = stack.pop()
            assert b
            x = a // b
            stack.append(x)
        elif line == '%':
            b = stack.pop()
            a = stack.pop()
            assert b
            x = a % b
            stack.append(x)
        elif line == '!':
            a = stack.pop()
            x = int(not a)
            stack.append(x)
        elif line == '~':
            a = stack.pop()
            x = (max_int - 1) ^ a
            stack.append(x)
        elif line == '+':
            b = stack.pop()
            a = stack.pop()
            assert a + b < max_int
            x = a + b
            stack.append(x)
        elif line == '*':
            b = stack.pop()
            a = stack.pop()
            assert a * b < max_int
            x = a * b
            stack.append(x)
        elif ' ' in line:
            op, arg = line.split(' ')
            if op == 'int':
                x = int(arg)
                stack.append(x)
            else:
                size += 1
                if op == 'store':
                    i = int(arg)
                    x = stack.pop()
                    slots[i] = x
                elif op == 'load':
                    i = int(arg)
                    x = slots[i]
                    stack.append(x)
                else:
                    raise
        else:
            raise

        # print(' '.join([hex(e) for e in stack]))
    return stack, slots, size


def test(a, PT, A, iters):
    expr = calc.mulw_divw3(Int(a), Int(PT), Int(A), iters)
    code = compileTeal(expr, Mode.Application)
    # print(code, file=open("/tmp/my.teal", "w"))
    stack, slots, size = eval_teal(code)
    assert len(stack) == 1
    x = stack[0]
    y = a * PT // A
    e = abs(y-x) / y
    return e, size

def test4(a, PT, A, iters):
    expr = calc.mulw_divw4(Int(a), Int(PT), Int(A), iters)
    code = compileTeal(expr, Mode.Application)
    # print(code, file=open("/tmp/my.teal", "w"))
    stack, slots, size = eval_teal(code)
    assert len(stack) == 1
    x = stack[0]
    y = a * PT // A
    e = abs(y-x) / y
    return e, size

top = 2**63-1
top0 = 2**60
emax = 0
sys.setrecursionlimit(1500)
while True:
    a = randint(top0, top)
    PT = randint(top0, top)
    amin = a * PT // top
    A = randint(amin, top)
    test4(a, PT, A, 48)
exit()

db = [
    # [0, 60, 0, 32],
    [1, 80, 0, 32],
    [2, 108, 0, 42],
    [3, 138, 0, 48],
    [7, 214, 0, 56],
    [15, 420, 0, 60],
    [31, 835, 0, 62],
]


while True:
    a = randint(0, top)
    PT = randint(0, top)
    amin = a * PT // top
    A = randint(amin, top)
    for row in db:
        try:
            e, size = test(a, PT, A, row[0])
        except:
            print(row[0])
            raise
        if e > row[2]:
            row[2] = e
            row[1] = size
            print('Errors:')
            for r in db:
                i, n, e, p = r
                e = e*10
                print(f'{i} iters, error: {e}%, {n} bytes, perfect for a, PT, A < 2^{p}')
