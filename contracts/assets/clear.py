from pyteal import *

from helpers.state import GlobalState, LocalState


def clear():
    TOTAL_LIQUIDITY_TOKENS = GlobalState('TOTAL_LIQUIDITY_TOKENS')
    ALGOS_BALANCE = GlobalState('ALGOS_BALANCE')
    TOKENS_BALANCE = GlobalState('TOKENS_BALANCE')
    ALGOS_TO_WITHDRAW = LocalState('ALGOS_TO_WITHDRAW')
    TOKENS_TO_WITHDRAW = LocalState('TOKENS_TO_WITHDRAW')
    USER_LIQUIDITY_TOKENS = LocalState('USER_LIQUIDITY_TOKENS')

    return Seq([
        TOTAL_LIQUIDITY_TOKENS.put(TOTAL_LIQUIDITY_TOKENS.get() - USER_LIQUIDITY_TOKENS.get()),
        ALGOS_BALANCE.put(ALGOS_BALANCE.get() + ALGOS_TO_WITHDRAW.get()),
        TOKENS_BALANCE.put(TOKENS_BALANCE.get() + TOKENS_TO_WITHDRAW.get())
    ])


if __name__ == "__main__":
    print(
        compileTeal(
            clear(),
            Mode.Application
        )
    )
