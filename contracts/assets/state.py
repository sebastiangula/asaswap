import sys
from enum import Enum

from pyteal import *

from helpers.state import GlobalState, LocalState
from helpers.parse import parse_args
from helpers.calc import mulw_divw


class ExchangeType:
    ALGOS_TO_ASA = "ALGOS_TO_ASA"
    ASA_TO_ASA = "ASA_TO_ASA"


class AlgosToAsaContract:
    def __init__(self, ratio_decimal_points: int, fee_pct: int):
        self.ratio_decimal_points = ratio_decimal_points
        self.fee_pct = fee_pct
        self.type = type
        self.setup_globals()
        self.setup_locals()
        self.setup_calculations()

    def setup_globals(self):
        self.total_liquidity_tokens = GlobalState("L")  # uint64
        self.a_balance = GlobalState("A")  # uint64
        self.b_balance = GlobalState("B")  # uint64
        self.escrow_addr = GlobalState("E")  # bytes
        self.creator_addr = GlobalState("C")  # bytes
        self.b_idx = GlobalState("Y")  # uint64
        self.liq_idx = GlobalState("Z")  # uint64

    def setup_locals(self):
        self.a_to_withdraw = LocalState("1")  # uint64
        self.b_to_withdraw = LocalState("2")  # uint64
        self.user_liquidity_tokens = LocalState("3")  # uint64

    def calculate_exchange_rate(self) -> Expr:
        self.exchange_rate = ScratchSlot()
        return self.exchange_rate.store(
            self.a_balance.get() * Int(self.ratio_decimal_points) / self.b_balance.get()
        )
        
    def get_exchange_rate(self, inline=False) -> Expr:
        if inline:
            return (
                self.a_balance.get()
                * Int(self.ratio_decimal_points)
                / self.b_balance.get()
            )
        return self.exchange_rate.load(TealType.uint64)

    def calculate_tx_ratio(self) -> Expr:
        self.tx_ratio = ScratchSlot()
        return self.tx_ratio.store(
            self.get_incoming_amount_for_primary_asset(Gtxn[2])
            * Int(self.ratio_decimal_points)
            / Gtxn[1].asset_amount()
        )

    def get_tx_ratio(self) -> Expr:
        return self.tx_ratio.load(TealType.uint64)

    def calculate_liquidity_calc(self) -> Expr:
        self.liquidity_calc = ScratchSlot()
        return self.liquidity_calc.store(
            self.get_incoming_amount_for_primary_asset(Gtxn[2])
            * self.total_liquidity_tokens.get()
            / self.a_balance.get()
        )

    def get_liquidity_calc(self) -> Expr:
        return self.liquidity_calc.load(TealType.uint64)

    def setup_calculations(self):
        self.a_calc = mulw_divw(
            self.a_balance.get(),
            Btoi(Txn.application_args[1]),
            self.total_liquidity_tokens.get()
        )
        self.b_calc = mulw_divw(
            self.b_balance.get(),
            Btoi(Txn.application_args[1]),
            self.total_liquidity_tokens.get()
        )

    def get_contract(self):
        return Cond(
            [Txn.application_id() == Int(0), self.on_create()],
            [Txn.on_completion() == OnComplete.OptIn, self.on_register()],
            [
                Txn.on_completion()
                == Or(OnComplete.UpdateApplication, OnComplete.DeleteApplication),
                Return(Int(0)),
            ],
            [Txn.on_completion() == OnComplete.CloseOut, self.on_closeout()],
            [Txn.application_args[0] == Bytes("U"), self.on_update()],
            [
                Txn.application_args[0] == Bytes("A"),
                self.on_add_liquidity(),
            ],
            [
                Txn.application_args[0] == Bytes("R"),
                self.on_remove_liquidity(),
            ],
            [Txn.application_args[0] == Bytes("S"), self.on_swap()],
            [Txn.application_args[0] == Bytes("W"), self.on_withdraw()],
            [Txn.application_args[0] == Bytes("E"), self.setup_escrow()],
            [Txn.application_args[0] == Bytes("X"), self.on_withdraw_liquidity()],
            [Txn.application_args[0] == Bytes("Y"), self.on_deposit_liquidity()],
        )

    def get_incoming_amount_for_primary_asset(self, tx) -> Expr:
        return tx.amount()

    def validate_incoming_tx_for_primary_asset(self, tx):
        return And(
            tx.type_enum() == TxnType.Payment,
            tx.receiver() == self.escrow_addr.get(),
        )

    def on_create(self):
        return Seq(
            [
                self.b_idx.put(Btoi(Txn.application_args[0])),
                self.liq_idx.put(Btoi(Txn.application_args[1])),
                self.b_balance.put(Int(0)),
                self.a_balance.put(Int(0)),
                self.total_liquidity_tokens.put(Int(0)),
                self.creator_addr.put(Txn.sender()),
                Return(Int(1)),
            ]
        )

    def on_register(self):
        return Seq(
            [
                # Set default values for user
                self.b_to_withdraw.put(Int(0)),
                self.a_to_withdraw.put(Int(0)),
                self.user_liquidity_tokens.put(Int(0)),
                Return(Int(1)),
            ]
        )

    def on_closeout(self):
        return Assert(
            And(
                self.b_to_withdraw.get() == Int(0),
                self.a_to_withdraw.get() == Int(0),
                self.user_liquidity_tokens.get() == Int(0),
            )
        )

    def on_update(self):
        return Seq(
            [
                # Update escrow address after creating it
                Assert(
                    And(
                        Txn.sender() == self.creator_addr.get(),
                        self.escrow_addr.get() == Int(0),
                    )
                ),
                self.escrow_addr.put(Txn.accounts[1]),
                Return(Int(1)),
            ]
        )

    def on_add_liquidity(self):
        return Seq(
            [
                Assert(
                    And(
                        Global.group_size() == Int(3),
                        Gtxn[1].type_enum() == TxnType.AssetTransfer,
                        Gtxn[1].asset_receiver() == self.escrow_addr.get(),
                        Gtxn[1].xfer_asset() == self.b_idx.get(),
                        self.validate_incoming_tx_for_primary_asset(Gtxn[2]),
                    )
                ),
                If(
                    And(
                        self.b_balance.get() != Int(0),
                        self.a_balance.get() != Int(0),
                    ),
                    Seq(
                        [
                            self.calculate_exchange_rate(),
                            self.calculate_tx_ratio(),
                            If(
                                # Check if transactions exchange rate matches or is max 1% different from current
                                Ge(self.get_exchange_rate(), self.get_tx_ratio()),
                                Assert(
                                    (self.get_exchange_rate() - self.get_tx_ratio())
                                    * Int(self.ratio_decimal_points)
                                    / self.get_exchange_rate()
                                    < Int(int(0.01 * self.ratio_decimal_points))
                                ),
                                Assert(
                                    (self.get_tx_ratio() - self.get_exchange_rate())
                                    * Int(self.ratio_decimal_points)
                                    / self.get_exchange_rate()
                                    < Int(int(0.01 * self.ratio_decimal_points))
                                ),
                            ),
                        ]
                    ),
                ),
                If(
                    # If its first transaction then add tokens directly from txn amount, else based on calculations
                    self.total_liquidity_tokens.get() == Int(0),
                    Seq(
                        [
                            self.user_liquidity_tokens.put(
                                self.get_incoming_amount_for_primary_asset(Gtxn[2])
                            ),
                            self.total_liquidity_tokens.put(
                                self.get_incoming_amount_for_primary_asset(Gtxn[2])
                            ),
                        ]
                    ),
                    Seq(
                        [
                            self.calculate_liquidity_calc(),
                            self.user_liquidity_tokens.put(
                                self.user_liquidity_tokens.get()
                                + self.get_liquidity_calc()
                            ),
                            self.total_liquidity_tokens.put(
                                self.total_liquidity_tokens.get()
                                + self.get_liquidity_calc()
                            ),
                        ]
                    ),
                ),
                self.b_balance.put(self.b_balance.get() + Gtxn[1].asset_amount()),
                self.a_balance.put(
                    self.a_balance.get()
                    + self.get_incoming_amount_for_primary_asset(Gtxn[2])
                ),
                Return(Int(1)),
            ]
        )

    def on_remove_liquidity(self):
        return Seq(
            [
                Assert(
                    And(
                        Global.group_size() == Int(1),
                        self.user_liquidity_tokens.get()
                        >= Btoi(Txn.application_args[1]),
                        self.a_to_withdraw.get() == Int(0),
                        self.b_to_withdraw.get() == Int(0),
                    )
                ),
                self.a_to_withdraw.put(self.a_calc),
                self.b_to_withdraw.put(self.b_calc),
                self.user_liquidity_tokens.put(
                    self.user_liquidity_tokens.get() - Btoi(Txn.application_args[1])
                ),
                self.total_liquidity_tokens.put(
                    self.total_liquidity_tokens.get() - Btoi(Txn.application_args[1])
                ),
                self.a_balance.put(self.a_balance.get() - self.a_to_withdraw.get()),
                self.b_balance.put(self.b_balance.get() - self.b_to_withdraw.get()),
                Return(Int(1)),
            ]
        )

    def on_withdraw_liquidity(self):
        return Seq(
            [
                Assert(
                    And(
                        Gtxn[1].xfer_asset() == self.liq_idx.get(),
                        self.user_liquidity_tokens.get() >= Gtxn[1].asset_amount(),
                        Gtxn[1].sender() == self.escrow_addr.get(),
                        Gtxn[2].receiver() == self.escrow_addr.get(),
                    )
                ),
                self.user_liquidity_tokens.put(
                    self.user_liquidity_tokens.get() - Gtxn[1].asset_amount()
                ),
                Return(Int(1)),
            ]
        )

    def on_deposit_liquidity(self):
        return Seq(
            [
                Assert(
                    And(
                        Global.group_size() == Int(2),
                        Gtxn[0].type_enum() == TxnType.ApplicationCall,
                        Gtxn[1].type_enum() == TxnType.AssetTransfer,
                        Gtxn[1].xfer_asset() == self.liq_idx.get(),
                        Gtxn[1].asset_receiver() == self.escrow_addr.get(),
                    )
                ),
                self.user_liquidity_tokens.put(
                    self.user_liquidity_tokens.get() + Gtxn[1].asset_amount()
                ),
                Return(Int(1)),
            ]
        )

    def on_swap(self):
        return Seq(
            [
                Assert(
                    And(
                        Global.group_size() == Int(2),
                        Gtxn[0].type_enum() == TxnType.ApplicationCall,
                        self.a_to_withdraw.get() == Int(0),
                        self.b_to_withdraw.get() == Int(0),
                    )
                ),
                Cond(
                    [
                        And(
                            Gtxn[1].type_enum() == TxnType.AssetTransfer,
                            Gtxn[1].xfer_asset() == self.b_idx.get(),
                        ),
                        Seq(
                            [
                                Assert(
                                    Gtxn[1].asset_receiver() == self.escrow_addr.get(),
                                ),
                                self.b_balance.put(
                                    self.b_balance.get() + Gtxn[1].asset_amount()
                                ),
                                self.a_to_withdraw.put(
                                    # Same as (exchange_rate * asset_amount * ((100 - fee_pct)/100)) / ratio_decimal_points
                                    (
                                        self.get_exchange_rate(inline=True)
                                        * Gtxn[1].asset_amount()
                                        * Int(100 - self.fee_pct)
                                    )
                                    / Int(self.ratio_decimal_points)
                                    / Int(100)
                                ),
                                self.a_balance.put(
                                    self.a_balance.get() - self.a_to_withdraw.get()
                                ),
                            ]
                        ),
                    ],
                    [
                        self.validate_incoming_tx_for_primary_asset(Gtxn[1]),
                        Seq(
                            [
                                self.a_balance.put(
                                    self.a_balance.get()
                                    + self.get_incoming_amount_for_primary_asset(
                                        Gtxn[1]
                                    )
                                ),
                                self.b_to_withdraw.put(
                                    mulw_divw (
                                        self.get_incoming_amount_for_primary_asset(
                                            Gtxn[1]
                                        )
                                        * Int(100 - self.fee_pct),
                                        Int(self.ratio_decimal_points),
                                        Int(100) * self.get_exchange_rate(inline=True)
                                    )
                                ),
                                self.b_balance.put(
                                    self.b_balance.get() - self.b_to_withdraw.get()
                                ),
                            ]
                        ),
                    ],
                ),
                Return(Int(1)),
            ]
        )

    def on_withdraw(self):
        return Seq(
            [
                Assert(
                    And(
                        Global.group_size() == Int(4),
                        Gtxn[1].asset_amount() == self.b_to_withdraw.get(),
                        Gtxn[1].sender() == self.escrow_addr.get(),
                        Gtxn[1].xfer_asset() == self.b_idx.get(),
                        self.verify_outgoing_tx_for_primary_asset(Gtxn[2]),
                        self.get_outgoing_amount_for_primary_asset(Gtxn[2])
                        == self.a_to_withdraw.get(),
                        Gtxn[3].receiver() == self.escrow_addr.get(),
                    )
                ),
                self.b_to_withdraw.put(Int(0)),
                self.a_to_withdraw.put(Int(0)),
                Return(Int(1)),
            ]
        )

    def verify_outgoing_tx_for_primary_asset(self, tx):
        return And(
            tx.type_enum() == TxnType.Payment,
            tx.sender() == self.escrow_addr.get(),
        )

    def get_outgoing_amount_for_primary_asset(self, tx) -> Expr:
        return tx.amount()

    def setup_escrow(self):
        return Seq(
            [
                Assert(
                    And(
                        Gtxn[0].sender() == self.creator_addr.get(),
                        self.escrow_addr.get() == Int(0),
                    )
                ),
                Return(Int(1)),
            ]
        )


class AsaToAsaContract(AlgosToAsaContract):
    def __init__(self, ratio_decimal_points: int, fee_pct: int):
        super().__init__(ratio_decimal_points, fee_pct)
        self.a_idx = GlobalState("X")  # uint64

    def get_incoming_amount_for_primary_asset(self, tx) -> Expr:
        return tx.asset_amount()

    def validate_incoming_tx_for_primary_asset(self, tx):
        return And(
            tx.type_enum() == TxnType.AssetTransfer,
            tx.xfer_asset() == self.a_idx.get(),
            tx.asset_receiver() == self.escrow_addr.get(),
        )

    def verify_outgoing_tx_for_primary_asset(self, tx):
        return And(
            tx.type_enum() == TxnType.AssetTransfer,
            tx.xfer_asset() == self.a_idx.get(),
            tx.sender() == self.escrow_addr.get(),
        )

    def get_outgoing_amount_for_primary_asset(self, tx) -> Expr:
        return tx.asset_amount()

    def on_create(self):
        return Seq(
            [
                self.b_idx.put(Btoi(Txn.application_args[0])),
                self.a_idx.put(Btoi(Txn.application_args[1])),
                self.liq_idx.put(Btoi(Txn.application_args[2])),
                self.b_balance.put(Int(0)),
                self.a_balance.put(Int(0)),
                self.total_liquidity_tokens.put(Int(0)),
                self.creator_addr.put(Txn.sender()),
                Return(Int(1)),
            ]
        )


if __name__ == "__main__":
    params = {
        "ratio_decimal_points": 1000000,
        "fee_pct": 3,
        "type": ExchangeType.ALGOS_TO_ASA,
    }

    # Overwrite params if sys.argv[1] is passed
    if len(sys.argv) > 1:
        params = parse_args(sys.argv[1], params)

    if params["type"] == ExchangeType.ALGOS_TO_ASA:
        print(
            compileTeal(
                AlgosToAsaContract(
                    int(params["ratio_decimal_points"]),
                    int(params["fee_pct"]),
                ).get_contract(),
                Mode.Application,
            )
        )
    elif params["type"] == ExchangeType.ASA_TO_ASA:
        print(
            compileTeal(
                AsaToAsaContract(
                    int(params["ratio_decimal_points"]),
                    int(params["fee_pct"]),
                ).get_contract(),
                Mode.Application,
            )
        )
