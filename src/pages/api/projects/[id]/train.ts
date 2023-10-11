import db from "@/core/db"; // 导入数据库模块
import { NextApiRequest, NextApiResponse } from "next"; // 导入 Next.js 的 API 请求和响应模块
import { getSession } from "next-auth/react"; // 导入 NextAuth.js 的 getSession 方法
import replicateClient from "@/core/clients/replicate"; // 导入 REPLICATE 的客户端模块
import { getRefinedInstanceClass } from "@/core/utils/predictions"; // 导入预测工具函数

// 定义异步处理函数，接收请求和响应对象作为参数
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const projectId = req.query.id as string; // 从请求参数中获取项目 ID
  const session = await getSession({ req }); // 获取用户会话信息

  if (!session?.user) { // 如果用户未登录，则返回未授权的错误响应
    return res.status(401).json({ message: "Not authenticated" });
  }

  // 从数据库中查找指定项目
  let project = await db.project.findFirstOrThrow({
    where: {
      id: projectId,
      userId: session.userId,
      modelStatus: "not_created",
      NOT: { stripePaymentId: null },
    },
  });

  // 获取实例类别
  const instanceClass = getRefinedInstanceClass(project.instanceClass);

  // 向 REPLICATE 的训练 API 发送 POST 请求，开始训练模型
  const responseReplicate = await replicateClient.post(
    "/v1/trainings",
    {
      input: {
        instance_prompt: `a photo of a ${process.env.NEXT_PUBLIC_REPLICATE_INSTANCE_TOKEN} ${instanceClass}`,
        class_prompt: `a photo of a ${instanceClass}`,
        instance_data: `https://${process.env.S3_UPLOAD_BUCKET}.s3.amazonaws.com/${project.id}.zip`,
        max_train_steps: Number(process.env.REPLICATE_MAX_TRAIN_STEPS || 3000),
        num_class_images: 200,
        learning_rate: 1e-6,
      },
      model: `${process.env.REPLICATE_USERNAME}/${project.id}`,
      webhook_completed: `${process.env.NEXTAUTH_URL}/api/webhooks/completed`,
    },
    {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  const replicateModelId = responseReplicate.data.id as string;

  project = await db.project.update({
    where: { id: project.id },
    data: { replicateModelId: replicateModelId, modelStatus: "processing" },
  });

  return res.json({ project });
};

export default handler;
