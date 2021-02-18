import sys

from pyteal import *

from helpers.state import GlobalState, LocalState
from helpers.parse import parse_args


def state(ratio_decimal_points: int, fee_pct: int):
    # globals
    TOTAL_LIQUIDITY_TOKENS = GlobalState('LIQ_TOKENS')  # uint64
    ALGOS_BALANCE = GlobalState('ALGOS_BAL')  # uint64
    TOKENS_BALANCE = GlobalState('ASA_BAL')  # uint64
    ESCROW_ADDR = GlobalState('ESCROW_ADDR')  # bytes
    CREATOR_ADDR = GlobalState('CREATOR_ADDR')  # bytes
    ASSET_IDX = GlobalState('ASSET_IDX')  # uint64
    # locals
    ALGOS_TO_WITHDRAW = LocalState('USR_ALGOS')  # uint64
    TOKENS_TO_WITHDRAW = LocalState('USR_ASA')  # uint64
    USER_LIQUIDITY_TOKENS = LocalState('USR_LIQ')  # uint64

    # exchange rate, always as ASA:ALGOS and in ratio_decimal_points precision
    EXCHANGE_RATE = ALGOS_BALANCE.get() * Int(ratio_decimal_points) / TOKENS_BALANCE.get()
    ALGOS_CALC = ALGOS_BALANCE.get() * Btoi(Txn.application_args[1]) / TOTAL_LIQUIDITY_TOKENS.get()
    TOKEN_CALC = TOKENS_BALANCE.get() * Btoi(Txn.application_args[1]) / TOTAL_LIQUIDITY_TOKENS.get()

    on_closeout = Assert(
        And(
            TOKENS_TO_WITHDRAW.get() == Int(0),
            ALGOS_TO_WITHDRAW.get() == Int(0),
            USER_LIQUIDITY_TOKENS.get() == Int(0),
        )
    )

    on_create = Seq([
        ASSET_IDX.put(Btoi(Txn.application_args[0])),
        TOKENS_BALANCE.put(Int(0)),
        ALGOS_BALANCE.put(Int(0)),
        TOTAL_LIQUIDITY_TOKENS.put(Int(0)),
        CREATOR_ADDR.put(Txn.sender()),
        Return(Int(1))
    ])

    on_update = Seq([
        # Update escrow address after creating it
        Assert(And(
            Txn.sender() == CREATOR_ADDR.get(),
            ESCROW_ADDR.get() == Int(0),
        )),
        ESCROW_ADDR.put(Txn.accounts[1]),
        Return(Int(1))
    ])

    setup_escrow = Seq([
        Assert(And(
            Gtxn[0].sender() == CREATOR_ADDR.get(),
            ESCROW_ADDR.get() == Int(0),
        )),
        Return(Int(1))
    ])

    on_register = Seq([
        # Set default values for user
        TOKENS_TO_WITHDRAW.put(Int(0)),
        ALGOS_TO_WITHDRAW.put(Int(0)),
        USER_LIQUIDITY_TOKENS.put(Int(0)),
        Return(Int(1))
    ])

    tx_ratio = Gtxn[2].amount() * Int(ratio_decimal_points) / Gtxn[1].asset_amount()
    liquidity_calc = Gtxn[2].amount() * TOTAL_LIQUIDITY_TOKENS.get() / ALGOS_BALANCE.get()
    on_add_liquidity = Seq([
        Assert(And(
            Global.group_size() == Int(3),
            Gtxn[1].type_enum() == TxnType.AssetTransfer,
            Gtxn[1].asset_receiver() == ESCROW_ADDR.get(),
            Gtxn[1].xfer_asset() == ASSET_IDX.get(),
            Gtxn[2].type_enum() == TxnType.Payment,
            Gtxn[2].receiver() == ESCROW_ADDR.get()
        )),
        If(
            And(
                TOKENS_BALANCE.get() != Int(0),
                ALGOS_BALANCE.get() != Int(0),
            ),
            If(
                # Check if transactions exchange rate matches or is max 1% different from current
                Ge(EXCHANGE_RATE, tx_ratio),
                Assert((EXCHANGE_RATE - tx_ratio) * Int(ratio_decimal_points) / EXCHANGE_RATE
                       < Int(int(0.01 * ratio_decimal_points))),
                Assert((tx_ratio - EXCHANGE_RATE) * Int(ratio_decimal_points) / EXCHANGE_RATE
                       < Int(int(0.01 * ratio_decimal_points)))
            ),
        ),
        If(
            # If its first transaction then add tokens directly from txn amount, else based on calculations
            TOTAL_LIQUIDITY_TOKENS.get() == Int(0),
            Seq([
                USER_LIQUIDITY_TOKENS.put(Gtxn[2].amount()),
                TOTAL_LIQUIDITY_TOKENS.put(Gtxn[2].amount()),
            ]),
            Seq([
                USER_LIQUIDITY_TOKENS.put(USER_LIQUIDITY_TOKENS.get() + liquidity_calc),
                TOTAL_LIQUIDITY_TOKENS.put(TOTAL_LIQUIDITY_TOKENS.get() + liquidity_calc),
            ])
        ),
        TOKENS_BALANCE.put(TOKENS_BALANCE.get() + Gtxn[1].asset_amount()),
        ALGOS_BALANCE.put(ALGOS_BALANCE.get() + Gtxn[2].amount()),
        Return(Int(1))
    ])

    on_remove_liquidity = Seq([
        Assert(And(
            Global.group_size() == Int(1),
            USER_LIQUIDITY_TOKENS.get() >= Btoi(Txn.application_args[1]),
            ALGOS_TO_WITHDRAW.get() == Int(0),
            TOKENS_TO_WITHDRAW.get() == Int(0),
        )),
        ALGOS_TO_WITHDRAW.put(ALGOS_CALC - Global.min_txn_fee() - Global.min_txn_fee()),
        TOKENS_TO_WITHDRAW.put(TOKEN_CALC),
        USER_LIQUIDITY_TOKENS.put(USER_LIQUIDITY_TOKENS.get() - Btoi(Txn.application_args[1])),
        TOTAL_LIQUIDITY_TOKENS.put(TOTAL_LIQUIDITY_TOKENS.get() - Btoi(Txn.application_args[1])),
        ALGOS_BALANCE.put(ALGOS_BALANCE.get() - ALGOS_TO_WITHDRAW.get() - Global.min_txn_fee() - Global.min_txn_fee()),
        TOKENS_BALANCE.put(TOKENS_BALANCE.get() - TOKENS_TO_WITHDRAW.get()),
        Return(Int(1))
    ])

    on_swap = Seq([
        Assert(And(
            Global.group_size() == Int(2),
            Gtxn[0].type_enum() == TxnType.ApplicationCall,
            ALGOS_TO_WITHDRAW.get() == Int(0),
            TOKENS_TO_WITHDRAW.get() == Int(0),
        )),
        Cond(
            [
                Gtxn[1].type_enum() == TxnType.AssetTransfer,
                Seq([
                    Assert(And(
                        Gtxn[1].asset_receiver() == ESCROW_ADDR.get(),
                        Gtxn[1].xfer_asset() == ASSET_IDX.get(),
                    )),
                    TOKENS_BALANCE.put(TOKENS_BALANCE.get() + Gtxn[1].asset_amount()),
                    ALGOS_TO_WITHDRAW.put(
                        # same as (exchange_rate * asset_amount * ((100 - fee_pct)/100)) / ratio_decimal_points
                        (EXCHANGE_RATE * Gtxn[1].asset_amount() * Int(100 - fee_pct))
                        / Int(ratio_decimal_points) / Int(100)
                    ),
                    ALGOS_BALANCE.put(ALGOS_BALANCE.get() - ALGOS_TO_WITHDRAW.get()),
                ])
            ],
            [
                Gtxn[1].type_enum() == TxnType.Payment,
                Seq([
                    Assert(Gtxn[1].receiver() == ESCROW_ADDR.get()),
                    ALGOS_BALANCE.put(ALGOS_BALANCE.get() + Gtxn[1].amount()),
                    TOKENS_TO_WITHDRAW.put(
                        (Gtxn[1].amount() * Int(100 - fee_pct))
                        * Int(ratio_decimal_points) / Int(100) / EXCHANGE_RATE
                    ),
                    TOKENS_BALANCE.put(TOKENS_BALANCE.get() - TOKENS_TO_WITHDRAW.get()),
                ])
            ]
        ),
        Return(Int(1))
    ])

    on_withdraw = Seq([
        Assert(And(
            Global.group_size() == Int(3),
            Gtxn[1].asset_amount() == TOKENS_TO_WITHDRAW.get(),
            Gtxn[1].sender() == ESCROW_ADDR.get(),
            Gtxn[1].xfer_asset() == ASSET_IDX.get(),
            Gtxn[2].amount() == ALGOS_TO_WITHDRAW.get(),
            Gtxn[2].sender() == ESCROW_ADDR.get(),
        )),
        TOKENS_TO_WITHDRAW.put(Int(0)),
        ALGOS_TO_WITHDRAW.put(Int(0)),
        Return(Int(1))
    ])

    return Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.OptIn, on_register],
        [Txn.on_completion() == Or(
            OnComplete.UpdateApplication,
            OnComplete.DeleteApplication
        ), Return(Int(0))],
        [Txn.on_completion() == OnComplete.CloseOut, on_closeout],
        [Txn.application_args[0] == Bytes('UPDATE'), on_update],
        [Txn.application_args[0] == Bytes('ADD_LIQUIDITY'), on_add_liquidity],
        [Txn.application_args[0] == Bytes('REMOVE_LIQUIDITY'), on_remove_liquidity],
        [Txn.application_args[0] == Bytes('SWAP'), on_swap],
        [Txn.application_args[0] == Bytes('WITHDRAW'), on_withdraw],
        [Txn.application_args[0] == Bytes('SETUP_ESCROW'), setup_escrow],
    )


if __name__ == '__main__':
    params = {
        'ratio_decimal_points': 1000000,
        'fee_pct': 3,
    }

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_args(sys.argv[1], params)

    print(
        compileTeal(
            state(
                int(params['ratio_decimal_points']),
                int(params['fee_pct']),
            ),
            Mode.Application,
        )
    )
