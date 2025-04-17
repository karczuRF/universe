import { SettingsGroup, SettingsGroupContent, SettingsGroupWrapper } from '../../components/SettingsGroup.styles';

import { Typography } from '@app/components/elements/Typography';

import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';
import { useTappletSignerStore } from '@app/store/useTappletSignerStore';

import { Stack } from '@app/components/elements/Stack';
import { CardContainer, ConnectionIcon } from '../../components/Settings.styles';
import { CardComponent } from '../../components/Card.component';
import SelectAccount from './SelectOotleAccount';
import { useOotleWalletStore } from '@app/store/useOotleWalletStore';
import { shortenSubstateAddress } from '@app/utils';
import { useTappletProviderStore } from '@app/store/useTappletProviderStore';

const OotleWalletBalance = () => {
    const { t } = useTranslation(['settings', 'ootle'], { useSuspense: false });

    const tappSigner = useTappletSignerStore((s) => s.tappletSigner);
    const isTappProviderInitialized = useTappletSignerStore((s) => s.isInitialized);
    const initTappletSigner = useTappletSignerStore((s) => s.initTappletSigner);
    const initTappletProvider = useTappletProviderStore((s) => s.initTappletProvider);
    const ootleAccount = useOotleWalletStore((s) => s.ootleAccount);
    const ootleAccountsList = useOotleWalletStore((s) => s.ootleAccountsList);
    const getOotleAccountInfo = useOotleWalletStore((s) => s.getOotleAccountInfo);
    const getOotleAccountsList = useOotleWalletStore((s) => s.getOotleAccountsList);
    const setDefaultAccount = useOotleWalletStore((s) => s.setDefaultAccount);

    // TODO fetch all data from backend
    const refreshProvider = useCallback(async () => {
        try {
            if (!tappSigner) {
                await initTappletSigner();
                await initTappletProvider();
                return;
            }
        } catch (error) {
            console.error(error);
        }
    }, [tappSigner, initTappletSigner, initTappletProvider]);

    const refreshAccount = useCallback(async () => {
        try {
            await getOotleAccountInfo();
            if (!ootleAccount) setDefaultAccount();
        } catch (error) {
            console.error(error);
        }
    }, [getOotleAccountInfo, ootleAccount, setDefaultAccount]);

    const refreshAccountsList = useCallback(async () => {
        try {
            await getOotleAccountsList();
        } catch (error) {
            console.error(error);
        }
    }, [getOotleAccountsList]);

    useEffect(() => {
        refreshProvider();
        refreshAccountsList();
        refreshAccount();
    }, []);

    return (
        <>
            <SettingsGroupWrapper>
                <SettingsGroup>
                    <SettingsGroupContent>
                        <Stack direction="row" justifyContent="right" alignItems="center">
                            <ConnectionIcon $isConnected={isTappProviderInitialized} size={20} />
                            <Typography variant="p">
                                {isTappProviderInitialized ? 'Provider initialized' : 'Provider not initialized'}
                            </Typography>
                        </Stack>
                        <Typography variant="h3">{t('Tari Ootle Account')}</Typography>
                        <Typography variant="h6">{ootleAccount?.account_name}</Typography>
                        <Typography variant="h6">{ootleAccount?.address}</Typography>
                    </SettingsGroupContent>
                </SettingsGroup>
                <SettingsGroup>
                    <SettingsGroupContent>
                        <Stack direction="column" justifyContent="space-between" alignItems="left">
                            <CardContainer>
                                {Object.entries(ootleAccount?.resources || []).map(([key, value]) => (
                                    <CardComponent
                                        key={key}
                                        heading={`${value.token_symbol}`}
                                        labels={[
                                            {
                                                labelText: 'balance',
                                                labelValue: value.balance || t('unknown', { ns: 'common' }),
                                            },
                                            {
                                                labelText: 'address',
                                                labelValue: shortenSubstateAddress(value.resource_address),
                                            },
                                        ]}
                                    />
                                ))}
                            </CardContainer>
                        </Stack>
                    </SettingsGroupContent>
                </SettingsGroup>

                <SelectAccount accountsList={ootleAccountsList} currentAccount={ootleAccount} />
            </SettingsGroupWrapper>
        </>
    );
};

export default OotleWalletBalance;
