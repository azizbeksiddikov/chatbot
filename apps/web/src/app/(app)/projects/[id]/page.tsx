import { ProjectScreen } from "@/components/screens/project-screen"

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <ProjectScreen projectId={id} />
}
