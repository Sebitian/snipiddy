import type { NextConfig } from "next";
import { config } from "process";

const nextConfig: NextConfig = {
  /* config options here */

  // output: 'export',

  // webpack: (config) => {
  //   config.resolve.alias = {
  //     ...config.resolve.alias,
  //     "sharp$" : false,
  //     "onnxruntime-node$" : false,
  //   }
  // }
};

export default nextConfig;


