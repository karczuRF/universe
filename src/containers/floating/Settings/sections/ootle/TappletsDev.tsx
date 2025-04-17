import { useTranslation } from 'react-i18next';

import { Typography } from '@app/components/elements/Typography.tsx';
import { Avatar, IconButton, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';

import { SettingsGroupContent, SettingsGroupTitle } from '../../components/SettingsGroup.styles.ts';
import { SquaredButton } from '@app/components/elements/buttons/SquaredButton.tsx';
import { TappletsGroup, TappletsGroupWrapper } from './OotleSettings.styles.ts';
import { MdLaunch, MdDelete } from 'react-icons/md';
import tariLogo from '@app/assets/tari.svg';
import { useTappletsStore } from '@app/store/useTappletsStore.ts';
import { useCallback, useEffect } from 'react';

import { Controller, useForm } from 'react-hook-form';
import { IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';
import { useAppStateStore } from '@app/store/appStateStore.ts';
import { Count, StyledForm, StyledInput, StyledStack } from './OotleSettings.styles.ts';
import { setError, setIsSettingsOpen } from '@app/store/index.ts';

const endpointRegex = /^(https?:\/\/)?(localhost|127\.0\.0\.1):\d{1,6}?$/;

export default function TappletsDev() {
    const { t } = useTranslation('ootle', { useSuspense: false });
    const initialDevTappEndpoint = '';
    const { devTapplets, setActiveTappById, addDevTapp, deleteDevTapp, getDevTapps } = useTappletsStore();
    const { isSettingsOpen } = useAppStateStore();
    const devTappletsCount = devTapplets?.length || 0;

    const {
        control,
        watch,
        handleSubmit,
        setValue,
        reset,
        trigger,
        formState: { errors },
    } = useForm({
        defaultValues: { endpoint: '' },
    });
    const endpoint = watch('endpoint');

    useEffect(() => {
        setValue('endpoint', initialDevTappEndpoint);
    }, [initialDevTappEndpoint, setValue]);

    const handleApply = useCallback(
        async (data: { endpoint: string }) => {
            console.warn('dev tapp', data.endpoint);
            await addDevTapp(data.endpoint);
        },
        [addDevTapp]
    );

    const handleReset = useCallback(() => {
        reset({ endpoint: initialDevTappEndpoint });
    }, [reset]);

    useEffect(() => {
        trigger('endpoint');
    }, [endpoint, trigger]);

    useEffect(() => {
        getDevTapps();
    }, []);

    const handleLaunch = useCallback(
        async (tappletId: number) => {
            try {
                setActiveTappById(tappletId, true);
                setIsSettingsOpen(!isSettingsOpen);
            } catch (e) {
                setError(`Error while launching dev tapplet: ${e}`);
            }
        },
        [isSettingsOpen, setActiveTappById]
    );

    return (
        <TappletsGroupWrapper $category="Dev Tapplets">
            <SquaredButton
                onClick={() => getDevTapps()}
                color="tariPurple"
                size="medium"
                style={{ width: '25%', alignContent: 'center', marginBottom: 10 }}
            >
                {t('refresh-list')}
            </SquaredButton>
            <StyledForm onSubmit={handleSubmit(handleApply)} onReset={handleReset}>
                <StyledStack direction="row" alignItems="center" gap={10}>
                    <Controller
                        name="endpoint"
                        control={control}
                        rules={{
                            pattern: {
                                value: endpointRegex,
                                message: 'Invalid endpoint format',
                            },
                        }}
                        render={({ field }) => {
                            const { ref: _ref, ...rest } = field;
                            return (
                                <StyledInput
                                    type="text"
                                    placeholder="New Dev Tapplet endpoint, e.g.: http://localhost:18000"
                                    hasError={!!errors.endpoint}
                                    {...rest}
                                />
                            );
                        }}
                    />
                    {!errors.endpoint && (
                        <IconButton type="submit">
                            <IoCheckmarkOutline />
                        </IconButton>
                    )}
                    <IconButton type="reset">
                        <IoCloseOutline />
                    </IconButton>
                </StyledStack>
                {errors.endpoint && <span style={{ color: 'red', fontSize: '12px' }}>{errors.endpoint.message}</span>}
            </StyledForm>
            <TappletsGroup>
                <SettingsGroupContent>
                    <SettingsGroupTitle>
                        <Typography variant="h6">{t('dev-tapplets')}</Typography>
                        {devTappletsCount ? (
                            <Count $count={devTappletsCount}>
                                <Typography>{devTappletsCount}</Typography>
                            </Count>
                        ) : null}
                    </SettingsGroupTitle>

                    <List sx={{ maxWidth: 600 }}>
                        {devTapplets.map((item, index) => (
                            <ListItem key={index}>
                                <ListItemAvatar>
                                    <Avatar src={tariLogo.toString()} />
                                </ListItemAvatar>
                                <ListItemText
                                    primary={item.display_name}
                                    secondary={`id: ${item.id} | endpoint: ${item.endpoint}`}
                                />
                                <IconButton
                                    aria-label="launch"
                                    style={{ marginRight: 10 }}
                                    onClick={() => handleLaunch(item.id)}
                                >
                                    <MdLaunch color="primary" />
                                </IconButton>
                                <IconButton
                                    aria-label="delete"
                                    style={{ marginRight: 10 }}
                                    onClick={() => {
                                        deleteDevTapp(item.id);
                                    }}
                                >
                                    <MdDelete color="primary" />
                                </IconButton>
                            </ListItem>
                        ))}
                    </List>
                </SettingsGroupContent>
            </TappletsGroup>
        </TappletsGroupWrapper>
    );
}
