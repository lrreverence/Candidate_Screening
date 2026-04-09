import { Navigate, useParams } from 'react-router-dom'

/** Old /apply/.../documents URLs redirect after the document step was removed. */
export default function ApplyDocumentsRedirect() {
  const { jobId } = useParams()

  if (jobId) {
    return <Navigate to={`/apply/${jobId}/success`} replace />
  }
  return <Navigate to="/profile/apply" replace />
}
