import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

export const SettingsPage = () => (
  <div>
    <PageHeader
      title="Settings"
      description="Account preferences are not available because the API does not currently provide settings endpoints."
    />
    <Card>
      <p className="text-sm text-slate-600">
        No preference changes are stored here. Contact an administrator to change account details.
      </p>
    </Card>
  </div>
)
