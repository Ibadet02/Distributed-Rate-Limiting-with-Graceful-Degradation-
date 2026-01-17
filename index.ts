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

    redis.get(username as string, (err, data) => {
      if (err) throw err;

      if (data) {
        res.status(200).send(setResponse(username as string, data));
      } else {
        next();
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500);
  }
}

app.get("/repos/:username", cache, getRepos);

app.listen(3000, () => {
  console.log(`Listening to port 3000`);
});
