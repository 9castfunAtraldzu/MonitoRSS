import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  SlideFade,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { FiTrash } from "react-icons/fi";
import { useState } from "react";
import { CategoryText, Loading } from "@/components";
import { useDeleteFeed, useFeed, useFeeds } from "../../hooks";
import { RefreshButton } from "../RefreshButton";
import RouteParams from "@/types/RouteParams";
import { SettingsForm } from "./SettingsForm";
import { ErrorAlert } from "@/components/ErrorAlert";
import { DiscordChannelName } from "@/features/discordServers/components/DiscordChannelName";
import { notifyError } from "@/utils/notifyError";
import { Feed } from "@/types";
import { FeedStatusTag } from "./FeedStatusTag";
import { WebhookForm } from "./WebhookForm";

interface Props {
  feedId?: string;
  onDeleted: () => void;
}

export const FeedSidebar: React.FC<Props> = ({ feedId, onDeleted }) => {
  const { t } = useTranslation();
  const { serverId } = useParams<RouteParams>();
  const { refetch: refetchFeeds, updateCachedFeed } = useFeeds({ serverId });
  const { feed, status, error, updateCache } = useFeed({
    feedId,
  });
  const { mutateAsync } = useDeleteFeed();
  const [deleting, setDeleting] = useState(false);

  if (!feedId || !serverId) {
    return null;
  }

  if (status === "loading") {
    return (
      <Flex justifyContent="center" padding="20">
        <Loading />
      </Flex>
    );
  }

  if (status === "error") {
    return (
      <Box height="100%">
        <ErrorAlert description={error?.message} />
      </Box>
    );
  }

  const onDeleteFeed = async () => {
    if (!feedId) {
      return;
    }

    try {
      setDeleting(true);
      await mutateAsync({
        feedId,
      });
      await refetchFeeds();
      onDeleted();
    } catch (err) {
      notifyError(t("common.errors.somethingWentWrong"), err as Error);
    } finally {
      setDeleting(false);
    }
  };

  const onFeedChanged = async (updatedFeed: Feed) => {
    updateCachedFeed(updatedFeed.id, updatedFeed);
    updateCache(updatedFeed);
  };

  return (
    <Stack
      spacing={6}
      overflow="auto"
      padding="10"
      height="100%"
      as={SlideFade}
      in={!!feed}
      unmountOnExit
    >
      <Stack spacing={6}>
        <Stack>
          <Stack>
            <Box>
              <FeedStatusTag status={feed?.status || "ok"} />
            </Box>
            <Heading size="lg" marginRight={4}>
              {feed?.title}
            </Heading>
          </Stack>
          <Text
            as="a"
            overflow="hidden"
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            href={feed?.url}
            target="_blank"
            rel="noopener noreferrer"
            title={feed?.url}
          >
            {feed?.url}
          </Text>
        </Stack>
        <Alert status="warning" hidden={feed && feed.status !== "failing"}>
          <Box>
            <AlertTitle>{t("pages.feed.connectingFailingTitle")}</AlertTitle>
            <AlertDescription display="block">
              {t("pages.feed.connectingFailingDescription", {
                reason: feed?.failReason || t("pages.feed.unknownReason"),
              })}
            </AlertDescription>
          </Box>
        </Alert>
        <Alert status="error" hidden={feed && feed.status !== "failed"}>
          <Box>
            <AlertTitle>{t("pages.feed.connectionFailureTitle")}</AlertTitle>
            <AlertDescription display="block">
              {t("pages.feed.connectionFailureText", {
                reason: feed?.failReason || t("pages.feed.unknownReason"),
              })}
              <Box marginTop="1rem">
                {feed && <RefreshButton feedId={feed.id} onSuccess={onFeedChanged} />}
              </Box>
            </AlertDescription>
          </Box>
        </Alert>
        <Alert status="warning" hidden={feed && feed.status !== "disabled"}>
          <Box>
            <AlertTitle>{t("pages.feed.disabledTitle")}</AlertTitle>
            <AlertDescription display="block">
              {t("pages.feed.disabledDescription", {
                reason: feed?.disabledReason || t("pages.feed.unknownReason"),
              })}
            </AlertDescription>
          </Box>
        </Alert>
      </Stack>
      <Stack>
        <Flex wrap="wrap">
          <CategoryText paddingRight="6" paddingBottom="6" title={t("pages.feed.channelLabel")}>
            {feed?.channel && <DiscordChannelName channelId={feed.channel} serverId={serverId} />}
          </CategoryText>
          <CategoryText paddingRight="6" paddingBottom="6" title={t("pages.feed.refreshRateLabel")}>
            {feed &&
              t("pages.feed.refreshRateValue", {
                seconds: feed.refreshRateSeconds,
              })}
          </CategoryText>
          <CategoryText paddingRight="6" paddingBottom="0" title={t("pages.feed.createdAtLabel")}>
            {feed?.createdAt}
          </CategoryText>
        </Flex>
        <Button as={Link} to={`${feedId}/message`} leftIcon={<ExternalLinkIcon />}>
          {t("features.feed.components.sidebar.customizeButton")}
        </Button>
        <Button
          variant="outline"
          leftIcon={<FiTrash />}
          isLoading={deleting}
          isDisabled={deleting}
          onClick={onDeleteFeed}
        >
          {t("features.feed.components.sidebar.deleteButton")}
        </Button>
      </Stack>
      {/* <Divider /> */}
      <Stack spacing={5}>
        <Stack spacing={5} divider={<Divider />}>
          <Heading as="h3" size="md" fontWeight="medium">
            {t("features.feed.components.sidebar.settings")}
          </Heading>
          <SettingsForm feedId={feedId} serverId={serverId} onUpdated={onFeedChanged} />
        </Stack>
        <Stack spacing={5} divider={<Divider />}>
          <Heading as="h3" size="md" fontWeight="medium">
            {t("features.feed.components.sidebar.webhookTitle")}
          </Heading>
          <WebhookForm feedId={feedId} serverId={serverId} onUpdated={onFeedChanged} />
        </Stack>
      </Stack>
    </Stack>
  );
};
