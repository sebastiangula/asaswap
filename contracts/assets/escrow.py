import sys

from pyteal import *

from helpers.state import GlobalState, LocalState
from helpers.parse import parse_args


def escrow(app_id):
    on_asset_opt_in = Seq([
        Assert(And(
            Gtxn[0].application_id() == Int(app_id),
            Gtxn[0].type_enum() == TxnType.ApplicationCall,
            Gtxn[0].application_args[0] == Bytes('SETUP_ESCROW'),
            Gtxn[1].type_enum() == TxnType.AssetTransfer,
            Gtxn[1].asset_amount() == Int(0),
        )),
        Return(Int(1))
    ])

    on_withdraw = Seq([
        Assert(And(
            Gtxn[0].application_id() == Int(app_id),
            Gtxn[0].type_enum() == TxnType.ApplicationCall,
            Gtxn[0].application_args[0] == Bytes('WITHDRAW'),
            Gtxn[1].type_enum() == TxnType.AssetTransfer,
            Gtxn[2].type_enum() == TxnType.Payment,
            Gtxn[1].fee() == Global.min_txn_fee(),
            Gtxn[2].fee() == Global.min_txn_fee(),
            Or(
                Gtxn[1].asset_amount() > Int(0),
                Gtxn[2].amount() > Int(0),
            ),
        )),
        Return(Int(1))
    ])

    return Cond(
        [Global.group_size() == Int(2), on_asset_opt_in],
        [Global.group_size() == Int(3), on_withdraw],
    )


if __name__ == '__main__':
    params = {
        'app_id': 123
    }

    # Overwrite params if sys.argv[1] is passed
    if(len(sys.argv) > 1):
        params = parse_args(sys.argv[1], params)

    print(
        compileTeal(
            escrow(
                int(params['app_id']),
            ),
            Mode.Signature,
        )
    )
