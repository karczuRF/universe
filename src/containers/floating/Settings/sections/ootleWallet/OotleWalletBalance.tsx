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
import { Button } from '@app/components/elements/buttons/Button';
import { useTappletProviderStore } from '@app/store/useTappletProviderStore';

const OotleWalletBalance = () => {
    const { t } = useTranslation(['settings', 'ootle'], { useSuspense: false });

    const tappSigner = useTappletSignerStore((s) => s.tappletSigner);
    const provider = useTappletProviderStore((s) => s.provider);
    const isTappProviderInitialized = useTappletSignerStore((s) => s.isInitialized);
    const initTappletSigner = useTappletSignerStore((s) => s.initTappletSigner);
    const initTappletProvider = useTappletProviderStore((s) => s.initTappletProvider);
    const ootleAccount = useOotleWalletStore((s) => s.ootleAccount);
    const ootleAccountsList = useOotleWalletStore((s) => s.ootleAccountsList);
    const getOotleAccountInfo = useOotleWalletStore((s) => s.getOotleAccountInfo);
    const getOotleAccountsList = useOotleWalletStore((s) => s.getOotleAccountsList);

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
        } catch (error) {
            console.error(error);
        }
    }, [getOotleAccountInfo]);

    const refreshAccountsList = useCallback(async () => {
        try {
            await getOotleAccountsList();
        } catch (error) {
            console.error(error);
        }
    }, [getOotleAccountsList]);

    const onClick = useCallback(async () => {
        try {
            const ls = await provider?.listSubstates({
                filter_by_template: null,
                filter_by_type: null,
                offset: null,
                limit: 10,
            });
            const ls1 = await tappSigner?.listSubstates({
                filter_by_template: null,
                filter_by_type: null,
                offset: null,
                limit: 10,
            });
            console.log('signer LIST SUBSTATE', ls1);
        } catch (error) {
            console.error(error);
        }
    }, [provider, tappSigner]);

    const onClickTemplates = useCallback(async () => {
        try {
            const t = await provider?.listTemplates();
            console.log('PROVIDER LIST TEMPLATES', t);
        } catch (error) {
            console.error(error);
        }
    }, [provider]);

    useEffect(() => {
        refreshProvider();
        refreshAccount();
        refreshAccountsList();
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
                        <Typography>{t('Tari Ootle Account')}</Typography>
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
                <Button onClick={onClick}>{'PROVIDER LIST SUBSTATE'}</Button>
                <Button onClick={onClickTemplates}>{'PROVIDER LIST TEMPLATES'}</Button>
                <SettingsGroup>
                    <SelectAccount accountsList={ootleAccountsList} currentAccount={ootleAccount} />
                </SettingsGroup>
            </SettingsGroupWrapper>
        </>
    );
};

export default OotleWalletBalance;
