package com.neuroforge.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.neuroforge.backend.dto.AddMemberRequest;
import com.neuroforge.backend.dto.TeamDtos;
import com.neuroforge.backend.dto.TeamRequest;
import com.neuroforge.backend.dto.UpdateMemberRoleRequest;
import com.neuroforge.backend.service.TeamService;

import lombok.RequiredArgsConstructor;

/** Teams are an Admin/PM feature (sidebar + endpoints). Team Members get 403 on every route here. */
@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public List<TeamDtos.Summary> list() {
        return teamService.list();
    }

    /** GET /api/teams/by-project/{projectId} — the single team for a project (null → 404). */
    @GetMapping("/by-project/{projectId}")
    public ResponseEntity<TeamDtos.Detail> byProject(@PathVariable Long projectId) {
        return teamService.findByProject(projectId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','PROJECT_LEAD','TEAM_LEAD')")
    public ResponseEntity<TeamDtos.Detail> create(@RequestBody TeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.create(request));
    }

    @GetMapping("/{id}")
    public TeamDtos.Detail get(@PathVariable Long id) {
        return teamService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','PROJECT_LEAD','TEAM_LEAD')")
    public TeamDtos.Detail update(@PathVariable Long id, @RequestBody TeamRequest request) {
        return teamService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','PROJECT_LEAD','TEAM_LEAD')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        teamService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{teamId}/members")
    public List<TeamDtos.MemberInfo> members(@PathVariable Long teamId) {
        return teamService.getMembers(teamId);
    }

    @PostMapping("/{teamId}/members")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','PROJECT_LEAD','TEAM_LEAD')")
    public TeamDtos.MemberInfo addMember(@PathVariable Long teamId, @RequestBody AddMemberRequest request) {
        return teamService.addMember(teamId, request.getUserId(), request.getTeamRole());
    }

    @PutMapping("/{teamId}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','PROJECT_LEAD','TEAM_LEAD')")
    public TeamDtos.MemberInfo updateMemberRole(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            @RequestBody UpdateMemberRoleRequest request) {
        return teamService.updateMemberRole(teamId, userId, request.getTeamRole());
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','PROJECT_MANAGER','PROJECT_LEAD','TEAM_LEAD')")
    public ResponseEntity<Void> removeMember(@PathVariable Long teamId, @PathVariable Long userId) {
        teamService.removeMember(teamId, userId);
        return ResponseEntity.noContent().build();
    }
}
