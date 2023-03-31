import path from 'path'
import envSchema from 'env-schema'
import S from 'fluent-json-schema'

export const awsConfig = {
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
  AWS_REGION: process.env.AWS_REGION,
}

export const awsBucketName = process.env.AWS_BUCKET_NAME;
export const linkExpireTime = process.env.AWS_LINK_EXPIRE;

export default function loadConfig(): void {
  const result = require('dotenv').config({
    path: path.join(__dirname, '..', '..', '.env'),
  })

  if (result.error) {
    throw new Error(result.error)
  }

  envSchema({
    data: result.parsed,
    schema: S.object()
      .prop(
        'NODE_ENV',
        S.string().enum(['development', 'testing', 'production']).required(),
      )
      .prop('API_HOST', S.string().required())
      .prop('API_PORT', S.string().required())
      .prop('APP_JWT_SECRET', S.string().required())
      .prop('DB_HOST', S.string().required())
      .prop('DB_PORT', S.string().required())
      .prop('DB_USER', S.string().required())
      .prop('DB_PASS', S.string().required())
      .prop('KAKAO_CLIENT_ID', S.string().required())
      .prop('KAKAO_AUTH_POST_URL', S.string().required())
      .prop('NAVER_CLIENT_ID', S.string().required())
      .prop('NAVER_CLIENT_SECRET', S.string().required())
      .prop('REDIS_HOST', S.string().required())
      .prop('REDIS_PORT', S.number().required())
      .prop('REDIS_PASS', S.string().required())
      .prop('REDIS_IDX', S.number().required())
      .prop('FS_DIR', S.string().required())
      .prop('FS_ERR_DIR', S.string().required())
      .prop('FS_URL_DIR', S.string().required())
  })
}
