import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonWrapper, StyledButton } from './BridgeButton.styles';

export default function BridgeButton() {
    const { t } = useTranslation('bridge-view', { useSuspense: false });

    const handleClick = useCallback(async () => {
        console.info('bridge');
    }, []);

    return (
        <ButtonWrapper>
            <StyledButton
                size="large"
                $hasStarted={false}
                fluid
                onClick={handleClick}
                icon={null}
                disabled={false}
                $isLoading={false}
            >
                {'Bridge'}
            </StyledButton>
        </ButtonWrapper>
    );
}
