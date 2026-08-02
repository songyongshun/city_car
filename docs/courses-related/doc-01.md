# aem 

## `aem enter` 实际依次执行的步骤

1. **解析入口**

   - `/usr/bin/aem` 是符号链接 → `/opt/apollo/aem/aem` → `/opt/apollo/aem/run.sh`。
   `run.sh` 先 source `env.sh`（设默认值：`AEM_VERSION=10.0.0-rc1-r4`、镜像仓库 `registry.baidubce.com/apollo/apollo-env-gpu`、容器前缀 `apollo_neo_dev_`、`APOLLO_ENV_NAME=$USER` 等）和 `funcs.sh`，置 `AEM_INITED=1`。

   - `run.sh`里指明按顺序执行哪些操作，具体操作的实现在 `funcs.sh` 里。

2. **`main()` 路由**

   因为是通过名为 `aem` 的符号链接调用、且脚本里定义了 `aem()` 函数，于是 `cmd=aem` → 调 `aem()` → 解析出 `aem-enter` → `/opt/apollo/aem/aem-enter`（`run.sh:267-279`）。

3. **`aem-enter` 加载配置**

（若`AEM_INITED` 为 1，不再重 source）：
   - `source ${PWD}/.env`，即 `.env.x86_64`，内容是：
     ```env
     APOLLO_ENV_NAME=edu
     APOLLO_ENV_WORKLOCAL=1
     APOLLO_ENV_CONTAINER_REPO='registry.baidubce.com/apollo/apollo-env-gpu'
     APOLLO_ENV_CONTAINER_TAG='9.0-latest'
     ```
   - 计算 `APOLLO_ENV_CONTAINER_NAME = apollo_neo_dev_ + edu = apollo_neo_dev_edu`
   - `source /home/swan/.aem/envs/edu/env.config`（里面设置一堆 `AEM_*`/`APOLLO_ENV_*` 变量）

4. **`apollo_enter_env`**：→ 调 `apollo_enter_container`（`funcs.sh:821`）。

5. **`apollo_start_stopped_container`**：

若容器处于 exited 状态则 `docker start`（`funcs.sh:814-818`）。

6. **收集环境变量**：

遍历所有 `APOLLO_ENV_*` 变量生成一堆 `-e`，再加 `HISTFILE/HISTSIZE/HISTFILESIZE/HISTCONTROL/DOCKER_USER`（`funcs.sh:824-835`）。

7. **`xhost +local:root`** 允许容器连 X server。

8. **执行**（`funcs.sh:841-847`）：
   ```bash
   docker exec \
     -u "${APOLLO_ENV_CONTAINER_USER}" \
     <一堆 -e APOLLO_ENV_*=...> \
     -e HISTFILE=/apollo_workspace/.cache/.bash_history \
     -e HISTSIZE=200000 \
     -e HISTFILESIZE=200000 \
     -e HISTCONTROL=ignorespace:erasedups \
     -e DOCKER_USER="${APOLLO_ENV_CONTAINER_USER}" \
     -w /apollo_workspace \
     -it \
     apollo_neo_dev_edu \
     /bin/bash
   ```

9. 退出后 `xhost -local:root`。
