import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import {
  setupIntegrationTests,
  teardownIntegrationTests,
} from '../../utils/integration-tests';
import { MongooseTestModule } from '../../utils/mongoose-test.module';
import {
  Patron,
  PatronFeature,
  PatronModel,
  PatronStatus,
} from './entities/patron.entity';
import {
  Supporter,
  SupporterFeature,
  SupporterModel,
} from './entities/supporter.entity';
import { SupportersService } from './supporters.service';
import { createTestSupporter } from '../../test/data/supporters.test-data';
import { createTestPatron } from '../../test/data/patron.test-data';
import dayjs from 'dayjs';
import { ConfigService } from '@nestjs/config';

describe('SupportersService', () => {
  let supportersService: SupportersService;
  let supporterModel: SupporterModel;
  let patronModel: PatronModel;
  let configService: ConfigService;
  const defaultMaxFeeds = 5;
  const userDiscordId = 'user-discord-id';

  beforeEach(async () => {
    const { init } = await setupIntegrationTests({
      providers: [SupportersService],
      imports: [
        MongooseTestModule.forRoot(),
        MongooseModule.forFeature([SupporterFeature, PatronFeature]),
      ],
    });

    const { module } = await init();

    supportersService = module.get<SupportersService>(SupportersService);
    supporterModel = module.get<SupporterModel>(getModelToken(Supporter.name));
    patronModel = module.get<PatronModel>(getModelToken(Patron.name));
    configService = module.get<ConfigService>(ConfigService);

    jest.spyOn(configService, 'get').mockImplementation((key) => {
      if (key === 'defaultMaxFeeds') {
        return defaultMaxFeeds;
      }
    });
  });

  afterEach(async () => {
    await teardownIntegrationTests();
  });

  describe('getBenefitsOfServer', () => {
    const serverId = 'server-id';

    describe('when there is no patron', () => {
      it('returns the supporter max feeds if supporter is not expired', async () => {
        const supporter = createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId],
          maxFeeds: 10,
          expireAt: dayjs().add(3, 'day').toDate(),
        });

        await supporterModel.create(supporter);

        const result = await supportersService.getBenefitsOfServer([serverId]);

        expect(result[0].maxFeeds).toEqual(supporter.maxFeeds);
      });

      it('returns the default max feeds if supporter is expired', async () => {
        const supporter = await createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId],
          maxFeeds: 10,
          expireAt: dayjs().subtract(1, 'day').toDate(),
        });

        await supporterModel.create(supporter);

        const result = await supportersService.getBenefitsOfServer([serverId]);

        expect(result[0].maxFeeds).toEqual(defaultMaxFeeds);
      });

      it('returns the default max feeds if supporter is not found', async () => {
        const result = await supportersService.getBenefitsOfServer([serverId]);

        expect(result[0].maxFeeds).toEqual(defaultMaxFeeds);
      });

      it('returns supporter max feeds if guild supporter has no expire at', async () => {
        const supporter = await createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId],
          maxFeeds: 10,
        });

        await supporterModel.create(supporter);

        const result = await supportersService.getBenefitsOfServer([serverId]);

        expect(result[0].maxFeeds).toEqual(supporter.maxFeeds);
      });
    });
    describe('when there is a patron', () => {
      it('returns the max feeds of an active patron', async () => {
        const supporterToInsert = createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId],
          maxGuilds: 10,
          maxFeeds: 10,
        });
        const patronToInsert = createTestPatron({
          discord: userDiscordId,
          status: PatronStatus.ACTIVE,
          pledge: 100,
        });

        await supporterModel.create(supporterToInsert);
        await patronModel.create(patronToInsert);

        const result = await supportersService.getBenefitsOfServer([serverId]);
        expect(result[0].maxFeeds).toBe(supporterToInsert.maxFeeds);
      });

      it('returns the max feeds of a declined patron within the grace period', async () => {
        const supporterToInsert = createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId],
          maxGuilds: 10,
          maxFeeds: 10,
        });
        const patronToInsert = createTestPatron({
          discord: userDiscordId,
          status: PatronStatus.DECLINED,
          pledge: 100,
          lastCharge: dayjs().subtract(2, 'days').toDate(),
        });

        await supporterModel.create(supporterToInsert);
        await patronModel.create(patronToInsert);

        const result = await supportersService.getBenefitsOfServer([serverId]);
        expect(result[0].maxFeeds).toEqual(supporterToInsert.maxFeeds);
      });

      it('does not return the supporter max feeds of a long-expired declined patron', async () => {
        const supporterToInsert = createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId],
          maxGuilds: 10,
          maxFeeds: 10,
        });
        const patronToInsert = createTestPatron({
          discord: userDiscordId,
          status: PatronStatus.DECLINED,
          pledge: 100,
          lastCharge: dayjs().subtract(6, 'days').toDate(),
        });

        await supporterModel.create(supporterToInsert);
        await patronModel.create(patronToInsert);

        const result = await supportersService.getBenefitsOfServer([serverId]);
        expect(result[0].maxFeeds).toBe(defaultMaxFeeds);
      });

      it('does not return supporter max feeds of a former patron', async () => {
        const supporterToInsert = createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId],
          maxGuilds: 10,
          maxFeeds: 10,
        });
        const patronToInsert = createTestPatron({
          discord: userDiscordId,
          status: PatronStatus.FORMER,
          pledge: 100,
        });

        await supporterModel.create(supporterToInsert);
        await patronModel.create(patronToInsert);

        const result = await supportersService.getBenefitsOfServer([serverId]);
        expect(result[0].maxFeeds).toBe(defaultMaxFeeds);
      });
    });
  });
  describe('for multiple servers', () => {
    const serverId1 = 'server-id-1';
    const serverId2 = 'server-id-2';

    it('returns the max feeds correctly', async () => {
      const supportersToInsert = [
        createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId1],
          maxGuilds: 10,
          maxFeeds: 10,
          expireAt: dayjs().add(1, 'month').toDate(),
        }),
        createTestSupporter({
          _id: userDiscordId + '-other',
          guilds: [serverId2],
          maxGuilds: 20,
          maxFeeds: 20,
          expireAt: dayjs().add(1, 'month').toDate(),
        }),
      ];

      await supporterModel.create(supportersToInsert);

      const result = await supportersService.getBenefitsOfServer([
        serverId1,
        serverId2,
      ]);
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.serverId === serverId1)?.maxFeeds).toEqual(
        supportersToInsert[0].maxFeeds,
      );
      expect(result.find((r) => r.serverId === serverId2)?.maxFeeds).toEqual(
        supportersToInsert[1].maxFeeds,
      );
      // expect(result[0].maxFeeds).toBe(supporterToInsert.maxFeeds);
    });

    it('returns webhook for every one', async () => {
      const supportersToInsert = [
        createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId1],
          expireAt: dayjs().add(1, 'month').toDate(),
        }),
        createTestSupporter({
          _id: userDiscordId + '-other',
          guilds: [serverId2],
          expireAt: dayjs().add(1, 'month').toDate(),
        }),
      ];

      await supporterModel.create(supportersToInsert);

      const result = await supportersService.getBenefitsOfServer([
        serverId1,
        serverId2,
      ]);
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.webhook)).toBe(true);
    });

    it('returns max feeds correctly when a single guild has multiple supporters', async () => {
      const supportersToInsert = [
        createTestSupporter({
          _id: userDiscordId,
          guilds: [serverId1],
          maxGuilds: 10,
          maxFeeds: 10,
          expireAt: dayjs().add(1, 'month').toDate(),
        }),
        createTestSupporter({
          _id: userDiscordId + '-other',
          guilds: [serverId1, serverId2],
          maxGuilds: 20,
          maxFeeds: 20,
          expireAt: dayjs().add(1, 'month').toDate(),
        }),
        createTestSupporter({
          _id: userDiscordId + '-other-2',
          guilds: [serverId2],
          maxGuilds: 30,
          maxFeeds: 30,
          expireAt: dayjs().add(1, 'month').toDate(),
        }),
      ];

      await supporterModel.create(supportersToInsert);

      const result = await supportersService.getBenefitsOfServer([
        serverId1,
        serverId2,
      ]);
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.serverId === serverId1)?.maxFeeds).toEqual(
        supportersToInsert[1].maxFeeds,
      );
      expect(result.find((r) => r.serverId === serverId2)?.maxFeeds).toEqual(
        supportersToInsert[2].maxFeeds,
      );
    });
  });
});
