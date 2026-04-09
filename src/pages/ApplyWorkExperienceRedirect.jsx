import { Navigate, useParams } from 'react-router-dom'

/** Legacy /apply/.../work-experience URLs; step removed — go to submission. */
export default function ApplyWorkExperienceRedirect() {
  const { jobId } = useParams()

  if (jobId) {
    return <Navigate to={`/apply/${jobId}/success`} replace />
  }
  return <Navigate to="/profile/apply" replace />
}
