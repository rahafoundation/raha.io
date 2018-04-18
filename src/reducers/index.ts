import { Action, combineReducers, Reducer } from "redux";
import modal, { ModalState } from "./modal";

// TODO: get rid of the two below reducers
import members, { MembersState } from "./members";

import { OperationsState, reducer as operations } from "./operations";
import {
  MembersState as NewMembersState,
  reducer as membersNew
} from "./membersNew";
import { ApiCallsState, reducer as apiCalls } from "./apiCalls";

import auth, { AuthState } from "./auth";

export interface AppState {
  members: MembersState; // TODO: nuke this
  membersNew: NewMembersState;
  auth: AuthState;
  operations: OperationsState;
  apiCalls: ApiCallsState;
  modal: ModalState;
}
const rootReducer = combineReducers({
  members, // TODO: nuke this
  membersNew,
  auth,
  operations,
  apiCalls,
  modal
});

export default rootReducer;
