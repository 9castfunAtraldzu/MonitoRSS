import { PipeTransform, Injectable, Inject, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { FastifyRequest } from "fastify";
import { DiscordChannelConnection } from "../../feeds/entities/feed-connections";
import { UserFeed } from "../../user-feeds/entities";
import { FeedConnectionNotFoundException } from "../exceptions";

export interface GetFeedDiscordChannelConnectionPipeOutput {
  feed: UserFeed;
  connection: DiscordChannelConnection;
}

@Injectable({
  scope: Scope.REQUEST,
})
export class GetFeedDiscordChannelConnectionPipe implements PipeTransform {
  constructor(@Inject(REQUEST) private readonly request: FastifyRequest) {}

  transform(feed: UserFeed): GetFeedDiscordChannelConnectionPipeOutput {
    const { connectionId } = this.request.params as Record<string, string>;

    if (!connectionId) {
      throw new Error("connectionId is missing in request params");
    }

    const connection = feed.connections.discordChannels.find((connection) =>
      connection.id.equals(connectionId)
    );

    if (!connection) {
      throw new FeedConnectionNotFoundException(
        `Connection ${connectionId} not found`
      );
    }

    return { feed, connection };
  }
}
