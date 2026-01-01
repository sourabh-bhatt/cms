import { getAllStates } from '@/app/actions/state-actions';
import { StateGrid } from '@/components/state-manager/StateGrid';

export const dynamic = 'force-dynamic';

export default async function StateManagerPage() {
    const states = await getAllStates();

    return (
        <div className="min-h-screen bg-gray-50/50">
            <StateGrid initialStates={states} />
        </div>
    );
}
