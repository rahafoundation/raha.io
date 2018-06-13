import * as React from "react";
import { connect, MapStateToProps } from "react-redux";

import { AppState } from "../../store";
import { Member } from "../../reducers/membersNew";
import { getMemberOperations } from "../../selectors/operations";

import OperationList from "../../components/OperationList";
import IntlMessage from "../../components/IntlMessage";
import {
  Operation,
  OperationType
} from "@raha.app/api-server/dist/models/Operation";

interface OwnProps {
  profileMember: Member;
  loggedInMember: Member | undefined;
}

interface StateProps {
  operations: Operation[];
}

type Props = OwnProps & StateProps;

const FeedView: React.StatelessComponent<Props> = props => {
  const { operations } = props;
  return (
    <section>
      <h1>
        <IntlMessage id="wallet.feed.header" />
      </h1>
      <OperationList operations={operations.reverse()} />
    </section>
  );
};

/* ================
 * Redux container
 * ================
 */
const mapStateToProps: MapStateToProps<StateProps, OwnProps, AppState> = (
  state,
  ownProps
) => {
  return {
    operations: getMemberOperations(state, ownProps.profileMember.uid).filter(
      op =>
        op.op_code === OperationType.MINT || op.op_code === OperationType.GIVE
    )
  };
};

export default connect(mapStateToProps)(FeedView);