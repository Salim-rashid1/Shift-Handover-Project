import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

export const ReportsPage = () => (
  <div>
    <PageHeader
      title="Reports"
      description="Reporting is not available because the API does not currently provide reporting endpoints."
    />
    <Card>
      <p className="text-sm text-slate-600">
        No report data or export is shown until reporting endpoints are implemented.
      </p>
    </Card>
  </div>
)
