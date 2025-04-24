import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonWrapper, StyledButton } from './BridgeButton.styles';
import { BRIDGE_TAPPLET_ID, useTappletsStore } from '@app/store/useTappletsStore';
import { setError } from '@app/store';

export default function BridgeButton() {
    const { t } = useTranslation('bridge', { useSuspense: false });
    const { setActiveTappById } = useTappletsStore();

    const handleClick = useCallback(
        async (tappletId: number) => {
            try {
                setActiveTappById(tappletId);
            } catch (e) {
                setError(`Error while launching tapplet: ${e}`);
            }
        },
        [setActiveTappById]
    );

    return (
        <ButtonWrapper>
            <StyledButton
                size="large"
                $hasStarted={false}
                fluid
                onClick={() => handleClick(BRIDGE_TAPPLET_ID)}
                icon={null}
                disabled={false}
                $isLoading={false}
            >
                {t(`buy-tari`)}
            </StyledButton>
        </ButtonWrapper>
    );
}
