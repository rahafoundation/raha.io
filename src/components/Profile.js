import React, { Component } from 'react';
import styled from 'styled-components';
import { connect } from 'react-redux';

import ActionButton from './ActionButton';
import Loading from './Loading';
import MemberRelations from './MemberRelations';
import TrustLevel from './TrustLevel';
import YoutubeVideo from './YoutubeVideo';
import { getAuthMemberDocIsLoaded, getAuthMemberDoc, getMemberDoc } from '../connectors';
import { fetchMemberByMidIfNeeded, fetchMemberByUidIfNeeded } from '../actions';
import { getMemberUidToOp } from '../helpers/ops';
import { OpCode } from '../operations';

interface Props {
  memberId: string;
  authMemberDoc: firebase.firestore.DocumentSnapshot;
  memberDoc: firebase.firestore.DocumentSnapshot;
}

const ProfileElem = styled.main`
  padding: 0 20px;
  > header {
    margin-bottom: 20px;

    > .memberTitle {
      display: flex;
      align-items: center;

      .trustButton {
        margin-left: 20px;
      }
    }
  }

  .joinVideo {
    max-width: 90vw;
    width: 600px;
    height: 400px;
  }
`

class Profile extends Component<Props> {
  componentWillReceiveProps(nextProps) {
    if (nextProps.memberId) {
      this.props.fetchMemberByMidIfNeeded(nextProps.memberId);
    }
  }

  // TODO should be can take action
  canTrustThisUser() {
    return !this.isOwnProfile()
      && this.props.authMemberDoc !== null
      && this.props.authMemberDoc.id !== this.props.uid
      && !this.props.trustedByUids.has(this.props.authMemberDoc.id);
  }

  isOwnProfile() {
    const { authFirebaseUser, memberDoc } = this.props;
    return authFirebaseUser && memberDoc && authFirebaseUser.uid === memberDoc.id;
  }

  render() {
    const { authMemberDocIsLoaded, member } = this.props;
    if (!authMemberDocIsLoaded || !member || member.isFetching) {
      return <Loading />;
    }
    const memberDoc = getMemberDoc(member);
    if (!memberDoc || !memberDoc.get('mid')) {
      // TODO make below message nice page
      return <div>Member "{this.props.memberId}" does not exist</div>;
    }
    const ownProfile = this.isOwnProfile();
    const fullName = memberDoc.get('full_name');
    const youtubeUrl = memberDoc.get('video_url');
    return (
      <ProfileElem>
        <header>
          <h1 className="memberTitle">
            {fullName}

            {
              this.canTrustThisUser() &&
              <ActionButton
                className="trustButton"
                toUid={this.props.uid}
                toMid={this.props.mid}
              />
            }
          </h1>
          {
            this.props.trustedByUids !== undefined &&
            // TODO pass in correct props. Should MemberRelations mapStateToProps be in redux?
            <TrustLevel
              ownProfile={ownProfile}
              trustLevel={memberDoc.get('invite_confirmed') ? 3 : 0}
              networkJoinDate={null}
              trustedByLevel2={null}
              trustedByLevel3={null}
            />
          }
        </header>

        <main>
          {
            youtubeUrl && <YoutubeVideo
              className="joinVideo" youtubeUrl={youtubeUrl}
            />
          }

          <MemberRelations uid={memberDoc.id} mid={memberDoc.get('mid')} />
        </main>
      </ProfileElem>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const authMemberDoc = getAuthMemberDoc(state);
  const memberId = ownProps.match.params.memberId;

  const receivedOps = Object.entries(state.uidToOpMeta).filter(uidOp => uidOp[1].op.applied && uidOp[1].op.data.to_uid === ownProps.uid);
  return {
    authFirebaseUser: state.auth.firebaseUser,
    authMemberDoc,
    authMemberDocIsLoaded: getAuthMemberDocIsLoaded(state),
    memberId,
    member: state.members.byMid[memberId],
    trustedByUids: getMemberUidToOp(receivedOps, OpCode.TRUST, x => x.creator_uid)
  };
}

export default connect(mapStateToProps, { fetchMemberByMidIfNeeded, fetchMemberByUidIfNeeded })(Profile);
