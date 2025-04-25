import { useMiningStatesSync } from '@app/hooks';
import MiningView from './MiningView/MiningView';
import { DashboardContentContainer } from './styles';
import { useTappletsStore } from '@app/store/useTappletsStore';
import { Tapplet } from '@app/components/tapplets/Tapplets';
import { useUIStore } from '@app/store';

export default function Dashboard() {
    const activeTapplet = useTappletsStore((s) => s.activeTapplet);
    const showTapplet = useUIStore((s) => s.showTapplet);
    useMiningStatesSync();

    return (
        <DashboardContentContainer $tapplet={!!activeTapplet}>
            {showTapplet && activeTapplet ? <Tapplet source={activeTapplet.source} /> : <MiningView />}
        </DashboardContentContainer>
    );
}
