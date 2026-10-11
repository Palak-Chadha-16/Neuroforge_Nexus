package com.neuroforge.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.neuroforge.backend.entity.ProjectMemberAssignment;

public interface ProjectMemberAssignmentRepository extends JpaRepository<ProjectMemberAssignment, Long> {
    List<ProjectMemberAssignment> findByProjectIdOrderByAssignedAtAsc(Long projectId);
    Optional<ProjectMemberAssignment> findByProjectIdAndUserId(Long projectId, Long userId);
    boolean existsByProjectIdAndProjectRoleIgnoreCaseAndUserIdNot(Long projectId, String projectRole, Long userId);
    void deleteByProjectIdAndUserId(Long projectId, Long userId);
    void deleteByProjectId(Long projectId);
    void deleteByUserId(Long userId);
}
