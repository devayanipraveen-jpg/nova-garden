import { prisma } from "../utils/prismaClient";
import { issueForProject, overlap, words } from "./analysisUtils";

function parseProfileList(value: string | undefined): string[] {
	try {
		const parsed = JSON.parse(value ?? "[]");
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
	} catch {
		return [];
	}
}

export async function recommendDeveloper(projectId: string, issueId: string) {
	const issue = await issueForProject(projectId, issueId);
	const issueText = `${issue.module.name} ${issue.title} ${issue.description}`;
	const issueTerms = words(issueText);
	const members = await prisma.projectMember.findMany({
		where: { projectId },
		include: {
			user: {
				include: {
					developerProfile: true,
					assignedIssues: {
						where: { projectId, status: { in: ["RESOLVED", "PREVENTED", "CLOSED"] } },
						select: { title: true, description: true, moduleId: true },
					},
				},
			},
		},
	});

	return members
		.flatMap(({ user }) => {
			const profile = user.developerProfile;
			if (!profile) return [];

			const familiarModules = parseProfileList(profile.modulesWorkedOn);
			const skills = parseProfileList(profile.skills);
			const moduleMatch = familiarModules.some((moduleName) => moduleName.toLowerCase() === issue.module.name.toLowerCase());
			const matchingSkills = skills.filter((skill) => issueTerms.has(skill.toLowerCase()));
			const priorMatches = user.assignedIssues.filter((pastIssue) => {
				const similarity = overlap(issueText, `${pastIssue.title} ${pastIssue.description}`).score;
				return pastIssue.moduleId === issue.moduleId || similarity >= 0.12;
			});

			if (!moduleMatch && matchingSkills.length === 0 && priorMatches.length === 0) return [];

			const score = Math.max(
				0,
				Math.min(100, 20 + (moduleMatch ? 42 : 0) + matchingSkills.length * 12 + Math.min(2, priorMatches.length) * 10 + Math.min(10, profile.resolutionCount / 3) - profile.currentWorkload * 6)
			);
			const reasons = [
				...(moduleMatch ? [`Familiar with ${issue.module.name}`] : []),
				...(matchingSkills.length > 0 ? [`Relevant expertise: ${matchingSkills.join(", ")}`] : []),
				...(priorMatches.length > 0 ? [`${priorMatches.length} similar resolved issue${priorMatches.length === 1 ? "" : "s"}`] : []),
				`${profile.currentWorkload} active assignments`,
			];

			return [{ developer: { id: user.id, name: user.name, email: user.email }, matchScore: Math.round(score), reasons }];
		})
		.sort((first, second) => second.matchScore - first.matchScore);
}
