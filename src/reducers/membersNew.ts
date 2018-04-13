import { Reducer } from "redux";

import { Uid, Mid } from "../identifiers";
import { MembersAction, OperationsActionType } from "../actions";
import { ApiOperation, OperationType } from "./operationsNew";
import OperationInvalidError from "../errors/OperationInvalidError";

const GENESIS_REQUEST_INVITE_OPS = [
  "InuYAjMISl6operovXIR",
  "SKI5CxMXWd4qjJm1zm1y",
  "SUswrxogVQ6S0rH8O2h7",
  "Y8FiyjOLs9O8AZNGzhwQ"
];
const GENESIS_TRUST_OPS = [
  "va9A8nQ4C4ZiAsJG2nLt",
  "CmVDdktn3c3Uo5pP4rV6",
  "uAFLhBjYtrpTXOZkJ6BD",
  "y5EKzzihWm8RlDCcfv6d"
];
export const GENESIS_USER = Symbol("GENESIS");

export interface UidSet {
  // can't use type Uid, bc this error: https://github.com/Microsoft/TypeScript/issues/7374
  [uid: string]: boolean;
}

/**
 * Members that we're in the process of building up from operations below.
 */
export class Member {
  public uid: Uid;
  public mid: Mid;
  public fullName: string;
  public invitedBy: Uid | typeof GENESIS_USER;

  public trustedBy: UidSet;
  public invited: UidSet;
  public trusts: UidSet;

  constructor(
    uid: Uid,
    mid: Mid,
    fullName: string,
    invitedBy: Uid | typeof GENESIS_USER,
    trusts?: UidSet,
    trustedBy?: UidSet,
    invited?: UidSet
  ) {
    this.uid = uid;
    this.mid = mid;
    this.fullName = fullName;
    this.invitedBy = invitedBy;

    this.trusts = trusts || {};
    this.trustedBy = trustedBy || {};
    this.invited = invited || {};
  }

  /* =====================
   * RELATIONSHIP METHODS
   * =====================
   * TODO: consider moving these relationships into their own reducers, rather
   * than having them directly on members, to avoid having to keep member
   * states all in sync.
   */
  public inviteMember(uid: Uid) {
    return new Member(
      this.uid,
      this.mid,
      this.fullName,
      this.invitedBy,
      this.trusts,
      { ...this.trustedBy, [uid]: true },
      { ...this.invited, [uid]: true }
    );
  }

  public trustMember(uid: Uid) {
    return new Member(
      this.uid,
      this.mid,
      this.fullName,
      this.invitedBy,
      { ...this.trusts, [uid]: true },
      this.trustedBy,
      this.invited
    );
  }

  public beTrustedByMember(uid: Uid) {
    return new Member(
      this.uid,
      this.mid,
      this.fullName,
      this.invitedBy,
      this.trusts,
      { ...this.trustedBy, [uid]: true },
      this.invited
    );
  }
}

export interface MemberLookupTable {
  // can't use type Uid, bc this error: https://github.com/Microsoft/TypeScript/issues/7374
  [uid: string]: Member;
}

export interface MembersState {
  byUid: MemberLookupTable;
  byMid: MemberLookupTable;
}

/**
 * @returns true if relevant/false otherwise
 * @throws OperationInvalidError if invalid
 */
function operationIsRelevantAndValid(operation: ApiOperation): boolean {
  if (!operation.creator_uid) {
    if (GENESIS_TRUST_OPS.includes(operation.id)) {
      return false; // no need for the genesis ops to be reflected in app state.
    }
    throw new OperationInvalidError("Must have uid", operation);
  }
  if (operation.op_code === OperationType.REQUEST_INVITE) {
    // Force to boolean
    // TODO: consider how else this could be messed up
    if (!!operation.data.to_uid) {
      return true;
    }
    return GENESIS_REQUEST_INVITE_OPS.includes(operation.id);
  }

  if (operation.op_code === OperationType.TRUST) {
    return !!operation.data.to_uid;
  }
  return false;
}

function assertUidPresentInState(
  prevState: MembersState,
  uid: Uid,
  operation: ApiOperation
) {
  if (!(uid in prevState.byUid)) {
    throw new OperationInvalidError(
      `Invalid operation: user ${uid} not present`,
      operation
    );
  }
}

function addMemberToState(
  prevState: MembersState,
  member: Member
): MembersState {
  return {
    byMid: { ...prevState.byMid, [member.mid]: member },
    byUid: { ...prevState.byUid, [member.uid]: member }
  };
}
function addMembersToState(
  prevState: MembersState,
  members: Member[]
): MembersState {
  return members.reduce(
    (memo, member) => addMemberToState(memo, member),
    prevState
  );
}

function applyOperation(
  prevState: MembersState,
  operation: ApiOperation
): MembersState {
  const { creator_mid, creator_uid, op_code, data } = operation;

  try {
    if (!operationIsRelevantAndValid(operation)) {
      return prevState;
    }

    switch (operation.op_code) {
      case OperationType.REQUEST_INVITE: {
        const { full_name, to_uid, to_mid } = operation.data;

        // the initial users weren't invited by anyone; so no need to hook up any associations.
        if (GENESIS_REQUEST_INVITE_OPS.includes(operation.id)) {
          return addMemberToState(
            prevState,
            new Member(creator_uid, creator_mid, full_name, GENESIS_USER)
          );
        }

        assertUidPresentInState(prevState, to_uid, operation);
        const inviter = prevState.byUid[to_uid].inviteMember(creator_uid);
        const inviteRequester = new Member(
          creator_uid,
          creator_mid,
          full_name,
          to_uid,
          { [to_uid]: true }
        );
        return addMembersToState(prevState, [inviter, inviteRequester]);
      }
      case OperationType.TRUST: {
        const { to_uid, to_mid } = operation.data;

        assertUidPresentInState(prevState, creator_uid, operation);
        assertUidPresentInState(prevState, to_uid, operation);
        const truster = prevState.byUid[creator_uid].trustMember(to_uid);
        const trusted = prevState.byUid[to_uid].beTrustedByMember(creator_uid);
        return addMembersToState(prevState, [truster, trusted]);
      }
      default:
        return prevState;
    }
  } catch (err) {
    if (err instanceof OperationInvalidError) {
      // TODO: [#log] do real logging
      // tslint:disable-next-line:no-console
      console.warn("Operation invalid", operation);
      return prevState;
    }
    throw err;
  }
}

const initialState: MembersState = { byUid: {}, byMid: {} };
export const reducer: Reducer<MembersState> = (
  state = initialState,
  untypedAction
) => {
  const action = untypedAction as MembersAction;
  switch (action.type) {
    case OperationsActionType.ADD_OPERATIONS: {
      return action.operations.reduce(
        (curState, operation) => applyOperation(curState, operation),
        state
      );
    }
    case OperationsActionType.SET_OPERATIONS: {
      return action.operations.reduce(
        (curState, op) => applyOperation(curState, op),
        initialState
      );
    }
    default:
      return state;
  }
};
