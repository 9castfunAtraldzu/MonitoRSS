import { Catch, HttpStatus } from "@nestjs/common";
import { ApiErrorCode } from "../../../common/constants/api-errors";
import { StandardException } from "../../../common/exceptions/standard-exception.exception";
import { StandardBaseExceptionFilter } from "../../../common/filters/standard-exception-filter";
import {
  MissingChannelPermissionsException,
  UserMissingManageGuildException,
} from "../../feeds/exceptions";
import {
  DiscordChannelPermissionsException,
  MissingDiscordChannelException,
} from "../exceptions";

const ERROR_CODES: Record<string, { status: HttpStatus; code: ApiErrorCode }> =
  {
    [MissingDiscordChannelException.name]: {
      status: HttpStatus.BAD_REQUEST,
      code: ApiErrorCode.FEED_MISSING_CHANNEL,
    },
    [DiscordChannelPermissionsException.name]: {
      status: HttpStatus.BAD_REQUEST,
      code: ApiErrorCode.FEED_MISSING_CHANNEL_PERMISSION,
    },
    [UserMissingManageGuildException.name]: {
      status: HttpStatus.FORBIDDEN,
      code: ApiErrorCode.FEED_USER_MISSING_MANAGE_GUILD,
    },
    [MissingChannelPermissionsException.name]: {
      status: HttpStatus.BAD_REQUEST,
      code: ApiErrorCode.FEED_MISSING_CHANNEL_PERMISSION,
    },
  };

@Catch(StandardException)
export class AddDiscordChannelConnectionFilter extends StandardBaseExceptionFilter {
  exceptions = ERROR_CODES;
}
