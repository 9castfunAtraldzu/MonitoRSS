import { ARTICLE_FIELD_DELIMITER } from "../articles/constants";
import { ArticleParserService } from "./article-parser.service";

const DL = ARTICLE_FIELD_DELIMITER;

describe("ArticleParserService", () => {
  let service: ArticleParserService;

  beforeEach(() => {
    service = new ArticleParserService();
  });

  describe("flatten", () => {
    it("flattens nested objects", () => {
      const article = {
        id: "hello world",
        author: {
          name: {
            tag: "tag",
          },
        },
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
        [`author${DL}name${DL}tag`]: article.author.name.tag,
      });
    });

    it("flattens arrays", () => {
      const article = {
        id: "hello world",
        tags: ["tag1", "tag2"],
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
        [`tags${DL}0`]: article.tags[0],
        [`tags${DL}1`]: article.tags[1],
      });
    });

    it("flattens arrays of objects", () => {
      const article = {
        id: "hello world",
        tags: [
          {
            name: "tag1",
          },
          {
            name: "tag2",
          },
        ],
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
        [`tags${DL}0${DL}name`]: article.tags[0].name,
        [`tags${DL}1${DL}name`]: article.tags[1].name,
      });
    });

    it("flattens arrays of objects with arrays", () => {
      const article = {
        id: "hello world",
        tags: [
          {
            name: "tag1",
            aliases: ["alias1", "alias2"],
          },
          {
            name: "tag2",
            aliases: ["alias3", "alias4"],
          },
        ],
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
        [`tags${DL}0${DL}name`]: article.tags[0].name,
        [`tags${DL}0${DL}aliases${DL}0`]: article.tags[0].aliases[0],
        [`tags${DL}0${DL}aliases${DL}1`]: article.tags[0].aliases[1],
        [`tags${DL}1${DL}name`]: article.tags[1].name,
        [`tags${DL}1${DL}aliases${DL}0`]: article.tags[1].aliases[0],
        [`tags${DL}1${DL}aliases${DL}1`]: article.tags[1].aliases[1],
      });
    });

    it("handles keys with the delimiter in it", () => {
      const article = {
        id: "hello world",
        a: {
          [`${DL}b`]: "c",
        },
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
        [`a${DL}${DL}b`]: article.a[`${DL}b`],
      });
    });

    it.each([
      { val: null, desc: "null" },
      { val: undefined, desc: "undefined" },
      { val: "", desc: "empty string" },
      { val: " ", desc: "whitespace" },
    ])("excludes $desc values from the final object", ({ val }) => {
      const article = {
        id: "hello world",
        a: val,
        b: {
          c: {
            d: val,
          },
        },
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
      });
    });

    it("omits dates", () => {
      const article = {
        id: "hello world",
        a: new Date(),
        b: {
          c: {
            d: {
              e: new Date(),
            },
          },
        },
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
      });
    });

    it("converts numbers to strings", () => {
      const article = {
        id: "hello world",
        a: 1,
        b: {
          c: {
            d: {
              e: 2,
            },
          },
        },
      };

      const flattenedArticle = service.flatten(article);

      expect(flattenedArticle).toEqual({
        id: article.id,
        a: "1",
        [`b${DL}c${DL}d${DL}e`]: "2",
      });
    });
  });
});