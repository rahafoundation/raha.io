import * as React from "react";
import { connect } from "react-redux";
import styled from "styled-components";
import {
  InteractiveForceGraph,
  ForceGraphNode,
  ForceGraphArrowLink
} from "react-vis-force";

import { AppState } from "../reducers";
import { Member } from "../reducers/membersNew";

interface OwnProps {}
interface StateProps {
  members: Member[];
}
interface DispatchProps {}
type Props = OwnProps & StateProps & DispatchProps;

const NetworkElem = styled.main`
  display: flex;
  align-items: center;
  flex-direction: column;
`;

const NetworkView: React.StatelessComponent<Props> = ({ members }) => {
  const graphNodes: Array<typeof ForceGraphNode> = [];
  const trustEdges: Array<typeof ForceGraphArrowLink> = [];
  const inviteEdges: Array<typeof ForceGraphArrowLink> = [];
  members.forEach(member => {
    graphNodes.push(
      <ForceGraphNode
        key={member.get("memberId")}
        node={{ id: member.get("memberId"), label: member.get("username") }}
        fill="gray"
      />
    );
    member.get("trusts").forEach(trustedUid => {
      trustEdges.push(
        <ForceGraphArrowLink
          key={`${member.get("memberId")}=>${trustedUid}`}
          link={{
            source: member.get("memberId"),
            target: trustedUid,
            value: 1
          }}
          stroke="blue"
        />
      );
    });
    member.get("invited").forEach(invitedUid => {
      inviteEdges.push(
        <ForceGraphArrowLink
          key={`${member.get("memberId")}=>${invitedUid}`}
          link={{
            source: member.get("memberId"),
            target: invitedUid,
            value: 1
          }}
          stroke="green"
        />
      );
    });
  });
  return (
    <NetworkElem>
      <section>
        <h1>Raha Invite Graph</h1>
        <InteractiveForceGraph
          labelAttr="label"
          highlightDependencies={true}
          simulationOptions={{
            animate: true
          }}
          zoom={true}
        >
          {graphNodes}
          {inviteEdges}
        </InteractiveForceGraph>
      </section>
      <section>
        <h1>Raha Trust Graph</h1>
        <InteractiveForceGraph
          labelAttr="label"
          highlightDependencies={true}
          simulationOptions={{
            animate: true
          }}
          zoom={true}
        >
          {graphNodes}
          {trustEdges}
        </InteractiveForceGraph>
      </section>
    </NetworkElem>
  );
};

function mapStateToProps(state: AppState): StateProps {
  return {
    members: Object.values(state.membersNew.byMemberUsername.toObject())
  };
}

export const Network = connect(mapStateToProps)(NetworkView);
