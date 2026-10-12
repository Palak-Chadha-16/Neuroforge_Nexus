package com.neuroforge.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.neuroforge.backend.entity.Project;
import com.neuroforge.backend.entity.Team;
import com.neuroforge.backend.entity.TeamMember;

public final class TeamDtos {

    private TeamDtos() {}

    /** One row of GET /api/teams: Team Name, Team ID, associated Project Name/ID. */
    public record Summary(
            Long id,
            String name,
            String teamCode,
            String description,
            Long projectId,
            String projectName,
            String projectCode,
            long memberCount) {

        public static Summary from(Team team, long memberCount) {
            Project project = team.getProject();
            return new Summary(
                    team.getId(),
                    team.getName(),
                    team.getTeamCode(),
                    team.getDescription(),
                    project == null ? null : project.getId(),
                    project == null ? null : project.getName(),
                    project == null ? null : project.getCode(),
                    memberCount);
        }
    }

    /** A row of the team's member table: Member, Email, Skill, Team Role (+ actions on the frontend). */
    public record MemberInfo(
            Long memberId,
            Long userId,
            String userCode,
            String fullName,
            String email,
            String skill,
            String teamRole,
            LocalDateTime joinedAt) {

        public static MemberInfo from(TeamMember member) {
            var user = member.getUser();
            return new MemberInfo(
                    member.getId(),
                    user.getId(),
                    user.getUserCode(),
                    user.getFullName(),
                    user.getEmail(),
                    user.getSkill() == null ? null : user.getSkill().getLabel(),
                    member.getTeamRole(),
                    member.getJoinedAt());
        }
    }

    /** GET /api/teams/{id} */
    public record Detail(
            Long id,
            String name,
            String teamCode,
            String description,
            Long projectId,
            String projectName,
            String projectCode,
            Long teamLeadId,
            String teamLeadName,
            List<MemberInfo> members) {}
}
