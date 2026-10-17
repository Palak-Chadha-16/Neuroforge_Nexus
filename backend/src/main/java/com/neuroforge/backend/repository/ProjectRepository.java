package com.neuroforge.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.neuroforge.backend.entity.Project;

import jakarta.persistence.LockModeType;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    long countByStatus(String status);

    boolean existsByProjectKeyIgnoreCase(String projectKey);

    boolean existsByProjectKeyIgnoreCaseAndIdNot(String projectKey, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findByIdForUpdate(@Param("id") Long id);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    long countByProjectManagerId(Long userId);
    long countByProjectLeadId(Long userId);

    List<Project> findByProjectManagerId(Long userId);
    List<Project> findByProjectLeadId(Long userId);

    /** PROJECT_MANAGER scope: projects they manage OR are a member of. */
    @Query("select distinct p from Project p left join p.members m "
            + "where p.projectManager.id = :userId or m.id = :userId order by p.id")
    List<Project> findManagedOrMemberOf(@Param("userId") Long userId);

    /** Project Lead scope: projects they lead or are assigned to. */
    @Query("select distinct p from Project p left join p.members m "
            + "where p.projectLead.id = :userId or m.id = :userId order by p.id")
    List<Project> findLedOrMemberOf(@Param("userId") Long userId);

    /** Team Lead scope: projects where the user is a Team Lead assignment. */
    @Query("select distinct p from Project p join p.team t join t.members tm "
            + "where tm.user.id = :userId and lower(tm.teamRole) = 'team lead' order by p.id")
    List<Project> findTeamLeadProjects(@Param("userId") Long userId);

    /** Execution-role scope: projects the caller is a member of. */
    @Query("select distinct p from Project p join p.members m where m.id = :userId order by p.id")
    List<Project> findByMemberId(@Param("userId") Long userId);

    /** Used when a user is deleted: remove them from every project's member list. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM project_members WHERE user_id = :userId", nativeQuery = true)
    int removeUserFromAllProjects(@Param("userId") Long userId);
}
