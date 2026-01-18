import express, { NextFunction, Request, Response } from "express";
import fetch from "node-fetch";
import RedisMock from "ioredis-mock";

const redis = new RedisMock();

const app = express();

function setResponse(username: string, repoCount: string) {
  return `<h1>${username} has ${repoCount} repos</h1>`;
}

async function getRepos(req: Request, res: Response, next: NextFunction) {
  try {
    console.log("Fetching data...");

    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = (await response.json()) as Record<string, string>;

    const repoCount = data.public_repos as string;

    redis.setex(username as string, 3600, repoCount);

    res.status(200).send(setResponse(username as string, repoCount));
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

async function cache(req: Request, res: Response, next: NextFunction) {
  try {
    const { username } = req.params;

    const data = await redis.get(username as string);

    if (data) {
      res.status(200).send(setResponse(username as string, data));
    } else {
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const userIp = req.ip || "anonymous";
    const currentTime = Date.now();

    await redis.zremrangebyscore(userIp, 0, currentTime - 10000);

    const requestCount = await redis.zcard(userIp);

    if (requestCount > 5) {
      return res.status(429).send("Too many requests");
    } else {
      await redis.zadd(userIp, currentTime, currentTime.toString());
      next();
    }
  } catch (err) {
    console.error("Error happened: ", err);
    next();
  }
}

app.get("/repos/:username", rateLimiter, cache, getRepos);

app.listen(3000, () => {
  console.log(`Listening to port 3000`);
});
