from pyteal import *

def mulw_divw2(a, PT, A):
    return a * PT / A

def make_step(op, *args):
    if op == Op.store:
        return args[0].store().__teal__()
    elif op == Op.load:
        return args[0].load().__teal__()
    else:
        return TealBlock.FromOp(TealOp(op), *args)

def make_teal(make_steps):
    cmds = make_steps()
    steps = map(lambda args: make_step(*args), cmds)
    start, end = next(steps)
    for step in steps:
        end.setNextBlock(step[0])
        end = step[1]
    return start, end

class mulw_divw4(Expr):
    def __init__(self, a, PT, A, iters):
        self.outputType = TealType.uint64
        self.a = a
        self.PT = PT
        self.A = A
        self.iters = iters
    def __teal__(self):
        def steps():
            A = ScratchSlot()
            MF = ScratchSlot()
            M = ScratchSlot()

            for iter in range(self.iters):
                if iter:
                    yield Op.mulw,
                else:
                    yield Op.mulw, self.a, self.PT

                yield Op.dup2,
                yield Op.pop,
                yield Op.addw,
                yield Op.dup2,
                yield Op.pop,
                yield Op.add,

                if iter:
                    yield Op.load, M
                    yield Op.addw,
                    yield Op.dup2,
                    yield Op.pop,
                    yield Op.add,

                    if iter == self.iters - 1:
                        yield Op.load, A
                        yield Op.div,

                    yield Op.store, M
                    yield Op.add,
                else:
                    yield Op.store, M

                yield Op.add,
                yield Op.dup,

                if iter:
                    yield Op.load, MF
                else:
                    yield Op.bitwise_not, Int(0)
                    yield Op.dup, self.A
                    yield Op.store, A
                    yield Op.mod,
                    yield Op.dup,
                    yield Op.store, MF

            yield Op.mul,
            for iter in range(self.iters):
                yield Op.add,
            yield Op.bitwise_not, Int(0)
            yield Op.load, A
            yield Op.div,
            yield Op.mul,
            yield Op.load, M
            yield Op.add,

        return make_teal(steps)

    def __str__(self):
        return "(mulw_divw4 {} {} {})".format(self.a, self.PT, self.A)

    def type_of(self):
        return self.outputType


class mulw_divw3(Expr):
    def __init__(self, a, PT, A, iters):
        self.outputType = TealType.uint64
        self.a = a
        self.PT = PT
        self.A = A
        self.iters = iters

    def __teal__(self):
        def steps():
            A = ScratchSlot()
            L = div_factor = ScratchSlot()
            S = mod_factor = ScratchSlot()
            result = ScratchSlot()

            def get_p():
                if self.iters > 30:
                    return 62
                if self.iters > 14:
                    return 60
                if self.iters > 6:
                    return 56
                elif self.iters > 2:
                    return 48
                elif self.iters > 1:
                    return 42
                else:
                    return 32

            p = get_p()
            max_int = 2**p
            max_adds = 2**(64-p) - 1

            yield Op.mulw, self.a, self.PT
            yield Op.dup2,
            yield Op.pop,

            yield Op.div, Int(max_int)
            yield Op.add, Int(1)
            yield Op.dup2, self.A
            yield Op.pop,
            yield Op.div,
            yield Op.dup,
            yield Op.store, A

            yield Op.div, Int(max_int)
            yield Op.add, Int(1)
            yield Op.load, A
            yield Op.dup2,
            yield Op.pop,
            yield Op.div,
            yield Op.store, A

            yield Op.mul,
            yield Op.dup,
            yield Op.store, S

            yield Op.div,
            yield Op.store, L

            yield Op.load, S
            yield Op.div,

            yield Op.load, L

            yield Op.bitwise_not, Int(0)
            yield Op.load, A
            yield Op.dup2,
            yield Op.div,
            yield Op.store, div_factor
            yield Op.mod,
            yield Op.store, mod_factor

            for iter in range(self.iters):
                if iter:
                    yield Op.mulw,
                yield Op.dup2,
                yield Op.load, A
                yield Op.div,
                yield Op.dup2,
                yield Op.pop,
                yield Op.load, div_factor
                yield Op.mul,
                yield Op.add,
                if iter:
                    yield Op.load, result
                    yield Op.add,
                yield Op.store, result
                yield Op.pop,
                yield Op.load, A
                yield Op.mod,
                yield Op.dup2,
                yield Op.pop,
                yield Op.load, mod_factor

            yield Op.mul,
            for iter in range(self.iters*2):
                if iter and iter % max_adds == 0:
                    yield Op.load, A
                    yield Op.dup2,
                    yield Op.div,
                    yield Op.load, result
                    yield Op.add,
                    yield Op.store, result
                    yield Op.mod,
                yield Op.add,
            yield Op.load, A
            yield Op.div,
            yield Op.load, result
            yield Op.add,

        return make_teal(steps)

    def __str__(self):
        return "(mulw_divw3 {} {} {})".format(self.a, self.PT, self.A)

    def type_of(self):
        return self.outputType

class mulw_divw(Expr):
    def __init__(self, a, PT, A):
        self.outputType = TealType.uint64
        self.a = a
        self.PT = PT
        self.A = A

    def __teal__(self):
        start, mulw = TealBlock.FromOp(TealOp(Op.mulw), self.a, self.PT)

        dup2, dup2End = TealBlock.FromOp(TealOp(Op.dup2))
        mulw.setNextBlock(dup2)

        sumMods, sumModsEnd = TealBlock.FromOp(TealOp(Op.add))
        dup2End.setNextBlock(sumMods)

        mods = ScratchSlot()
        storeMods, storeModsEnd = mods.store().__teal__()
        sumModsEnd.setNextBlock(storeMods)

        aPTLpop, aPTLpopEnd = TealBlock.FromOp(TealOp(Op.pop))
        storeModsEnd.setNextBlock(aPTLpop)

        aPTHdup, APTHdupEnd = TealBlock.FromOp(TealOp(Op.dup))
        aPTLpopEnd.setNextBlock(aPTHdup)

        xADup, xADupEnd = TealBlock.FromOp(TealOp(Op.dup2), Int(2**64-1), self.A)
        APTHdupEnd.setNextBlock(xADup)

        xAm, xAmEnd = TealBlock.FromOp(TealOp(Op.mod))
        xADupEnd.setNextBlock(xAm)

        xmods = ScratchSlot()
        storexMods, storexModsEnd = xmods.store().__teal__()
        xAmEnd.setNextBlock(storexMods)

        xAd, xAdEnd = TealBlock.FromOp(TealOp(Op.div))
        storexModsEnd.setNextBlock(xAd)

        aPTHxad, aPTHxadEnd = TealBlock.FromOp(TealOp(Op.mul))
        xAdEnd.setNextBlock(aPTHxad)

        result = ScratchSlot()
        storeResult, storeResultEnd = result.store().__teal__()
        aPTHxadEnd.setNextBlock(storeResult)

        loadXMods, loadXModsEnd = xmods.load().__teal__()
        storeResultEnd.setNextBlock(loadXMods)

        mulXMods, mulXModsEnd = TealBlock.FromOp(TealOp(Op.mul))
        loadXModsEnd.setNextBlock(mulXMods)

        loadMods, loadModsEnd = mods.load().__teal__()
        mulXModsEnd.setNextBlock(loadMods)

        sumAllMods, sumAllModsEnd = TealBlock.FromOp(TealOp(Op.add))
        loadModsEnd.setNextBlock(sumAllMods)

        resultFromMods, resultFromModsEnd = TealBlock.FromOp(TealOp(Op.div), self.A)
        sumAllModsEnd.setNextBlock(resultFromMods)

        loadResult, loadResultEnd = result.load().__teal__()
        resultFromModsEnd.setNextBlock(loadResult)

        finalSum, finalSumEnd = TealBlock.FromOp(TealOp(Op.add))
        loadResultEnd.setNextBlock(finalSum)

        return start, finalSumEnd


    def __str__(self):
        return "(mulw_divw {} {} {})".format(self.a, self.PT, self.A)

    def type_of(self):
        return self.outputType