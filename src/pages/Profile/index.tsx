import * as React from "react";
import { connect, MapStateToProps } from "react-redux";
import styled from "styled-components";

import { AppState } from "../../store";
import { Uid, Mid } from "../../identifiers";
import { Member, UidSet, GENESIS_USER } from "../../reducers/membersNew";
import MemberRelations from "./MemberRelations";

import ActionButton from "../../components/ActionButton";
import Loading from "../../components/Loading";
import TrustLevel from "../../components/TrustLevel";
import InviteVideo from "../../components/InviteVideo";

/* ================
 * Component types
 * ================
 */
interface OwnProps {
  match: { params: { memberMid: Mid } };
}

interface StateProps {
  loggedInMember?: Member;
  profileData?: {
    profileMember: Member;
    trustedMembers: Member[];
    trustedByMembers: Member[];
    invitedMembers: Member[];
    invitedByMember: Member | typeof GENESIS_USER;
  };
}
type Props = OwnProps & StateProps;

/* =============
 * Data helpers
 * =============
 */
function isOwnProfile(
  loggedInMember: Member | undefined,
  profileMember: Member
): boolean {
  return !!loggedInMember && loggedInMember.uid === profileMember.uid;
}

function canTrustUser(
  loggedInMember: Member | undefined,
  toTrust: Member
): boolean {
  return (
    !!loggedInMember &&
    !isOwnProfile(loggedInMember, toTrust) &&
    !loggedInMember.trusts[toTrust.uid]
  );
}

/**
 * Invite confirmed is defined by satifying one of the following:
 * a) the user was invited as part of the genesis
 * b) the user has been trusted by the person inviting them.
 */
function isInviteConfirmed(profileMember: Member): boolean {
  return (
    profileMember.invitedBy === GENESIS_USER ||
    profileMember.invitedBy in profileMember.trustedBy
  );
}

/* ==================
 * Styled components
 * ==================
 */

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
`;

/**
 * Presentational component for displaying a profile.
 */
const ProfileView: React.StatelessComponent<Props> = props => {
  const { profileData, loggedInMember } = props;
  if (!profileData) {
    return <Loading />;
  }
  const {
    profileMember,
    trustedByMembers,
    trustedMembers,
    invitedByMember,
    invitedMembers
  } = profileData;
  const inviteConfirmed = isInviteConfirmed(profileMember);

  return (
    <ProfileElem>
      <header>
        <h1 className="memberTitle">
          {profileMember.fullName}

          {canTrustUser(loggedInMember, profileMember) && (
            <ActionButton
              className="trustButton"
              toUid={profileMember.uid}
              /* TODO: mid shouldn't be required */
              toMid={profileMember.mid}
            />
          )}
        </h1>
        {/* TODO: This component looks like it has extraneous deps */}
        <TrustLevel
          ownProfile={isOwnProfile(loggedInMember, profileMember)}
          trustLevel={inviteConfirmed ? 3 : 0}
          networkJoinDate={0}
          trustedByLevel2={0}
          trustedByLevel3={0}
        />
      </header>

      <main>
        {inviteConfirmed ? (
          // TODO: should be using mid
          // TODO: should be using internationalized message
          <InviteVideo memberId={profileMember.mid} />
        ) : (
          <div>Pending trust confirmation before showing public video</div>
        )}

        <MemberRelations
          invitedByMember={invitedByMember}
          trustedMembers={trustedMembers}
          invitedMembers={invitedMembers}
          trustedByMembers={trustedByMembers}
        />
      </main>
    </ProfileElem>
  );
};

/* ================
 * Redux container
 * ================
 */

// TODO: make this a selector on the state
// TODO: keep a lookup table by Mid, not just Uid, to make this efficient
function getMemberByMid(state: AppState, mid: Mid): Member | undefined {
  return Object.values(state.membersNew).find(member => member.mid === mid);
}

// TODO: make this a selector on the state, not inline in this container
function getMembersFromUidSet(state: AppState, uids: UidSet): Member[] {
  return Object.keys(uids).map(uid => state.membersNew[uid]);
}

// TODO: make this a selector on the state, not inline in this container
function getLoggedInMember(state: AppState) {
  const loggedInFirebaseUid =
    state.auth.firebaseUser !== null ? state.auth.firebaseUser.uid : undefined;
  return loggedInFirebaseUid
    ? state.membersNew[loggedInFirebaseUid]
    : undefined;
}

const mapStateToProps: MapStateToProps<StateProps, OwnProps, AppState> = (
  state,
  ownProps
) => {
  const loggedInMember = getLoggedInMember(state);
  const profileMember = getMemberByMid(state, ownProps.match.params.memberMid);
  if (!profileMember) {
    return { loggedInMember };
  }

  const invitedByMember =
    profileMember && profileMember.invitedBy === GENESIS_USER
      ? GENESIS_USER
      : state.membersNew[profileMember.invitedBy];
  return {
    loggedInMember,
    profileData: {
      profileMember,
      trustedMembers: getMembersFromUidSet(state, profileMember.trusts),
      trustedByMembers: getMembersFromUidSet(state, profileMember.trustedBy),
      invitedMembers: getMembersFromUidSet(state, profileMember.invited),
      invitedByMember
    }
  };
};

export default connect(mapStateToProps)(ProfileView);
