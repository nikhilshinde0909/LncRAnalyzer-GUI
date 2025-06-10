import { Router } from 'express'
import os from 'os'
import Docker from 'dockerode'
import checkDiskSpace from 'check-disk-space'

const router = Router()

router.get('/system-info', async (req, res) => {
  try {
    const totalMem = os.totalmem()
    const usedMem = totalMem - os.freemem()
    const cpuLoad = os.loadavg()[0]
    const cpuCount = os.cpus().length
    const cpuUsagePercent = Number(((cpuLoad / cpuCount) * 100).toFixed(1))

    const docker = new Docker()
    const dockerRunning = await docker.ping().then(() => true).catch(() => false)

    const disk = await checkDiskSpace('/')

    res.json({
      dockerRunning,
      cpuUsagePercent,
      memory: { used: usedMem, total: totalMem },
      storage: { free: disk.free, total: disk.size },
    })
  } catch (e) {
    console.error("System info error:", e)
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router

