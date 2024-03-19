import { BufferAttribute, Euler, Vector3 } from "three"
import { VRMExpressionPresetName } from "@pixiv/three-vrm"
function ToOutputVRMMeta(vrmMeta, icon, outputImage) {
  return {
    allowedUserName: vrmMeta.allowedUserName,
    author: vrmMeta.author,
    commercialUssageName: vrmMeta.commercialUssageName,
    contactInformation: vrmMeta.contactInformation,
    licenseName: vrmMeta.licenseName,
    otherLicenseUrl: vrmMeta.otherLicenseUrl,
    otherPermissionUrl: vrmMeta.otherPermissionUrl,
    reference: vrmMeta.reference,
    sexualUssageName: vrmMeta.sexualUssageName,
    texture: icon ? outputImage.length - 1 : undefined,
    title: vrmMeta.title,
    version: vrmMeta.version,
    violentUssageName: vrmMeta.violentUssageName,
  }
}
// WebGL(OpenGL)マクロ定数
var WEBGL_CONST
;(function (WEBGL_CONST) {
  WEBGL_CONST[(WEBGL_CONST["ARRAY_BUFFER"] = 34962)] = "ARRAY_BUFFER"
  WEBGL_CONST[(WEBGL_CONST["ELEMENT_ARRAY_BUFFER"] = 34963)] =
    "ELEMENT_ARRAY_BUFFER"
  WEBGL_CONST[(WEBGL_CONST["BYTE"] = 5120)] = "BYTE"
  WEBGL_CONST[(WEBGL_CONST["UNSIGNED_BYTE"] = 5121)] = "UNSIGNED_BYTE"
  WEBGL_CONST[(WEBGL_CONST["SHORT"] = 5122)] = "SHORT"
  WEBGL_CONST[(WEBGL_CONST["UNSIGNED_SHORT"] = 5123)] = "UNSIGNED_SHORT"
  WEBGL_CONST[(WEBGL_CONST["UNSIGNED_INT"] = 5125)] = "UNSIGNED_INT"
  WEBGL_CONST[(WEBGL_CONST["FLOAT"] = 5126)] = "FLOAT"
  WEBGL_CONST[(WEBGL_CONST["LINEAR"] = 9729)] = "LINEAR"
  WEBGL_CONST[(WEBGL_CONST["REPEAT"] = 10497)] = "REPEAT"
})(WEBGL_CONST || (WEBGL_CONST = {}))
const BLENDSHAPE_PREFIX = "blend_"
const MORPH_CONTROLLER_PREFIX = "BlendShapeController_"
const SPRINGBONE_COLLIDER_NAME = "vrmColliderSphere"
const EXPORTER_VERSION = "alpha-v1.0"
const CHUNK_TYPE_JSON = "JSON"
const CHUNK_TYPE_BIN = "BIN\x00"
const GLTF_VERSION = 2
const HEADER_SIZE = 12
function convertMetaToVRM0(meta) {
  return {
    title: meta.name,
    version: "v0",
    author: meta.authors[0] || "",
    contactInformation: meta.contactInformation,
    allowedUserName: meta.allowedUserName,
    violentUssageName: meta.allowExcessivelyViolentUsage ? "Allow" : "Disallow",
    sexualUssageName: meta.allowExcessivelySexualUsage ? "Allow" : "Disallow",
    commercialUssageName: "Disallow",
  }
}
function convertHumanoidToVRM0(humanoid) {
  const newHumanBones = []
  for (const prop in humanoid.humanBones) {
    newHumanBones.push({
      bone: prop,
      node: humanoid.humanBones[prop].node,
    })
  }
  return {
    humanBones: newHumanBones,
  }
}

function getVRM0BlendshapeName(curName, isPresetName) {
  let result = ""
  switch (curName) {
    case "happy":
      result = "joy"
      break
    case "sad":
      result = "sorrow"
      break
    case "relaxed":
      result = "fun"
      break
    case "aa":
      result = "a"
      break
    case "ih":
      result = "i"
      break
    case "ou":
      result = "u"
      break
    case "ee":
      result = "e"
      break
    case "oh":
      result = "o"
      break
    case "blinkLeft":
      return isPresetName ? "blink_l" : "Blink_L"
    case "blinkRight":
      return isPresetName ? "blink_r" : "Blink_R"
    default:
      result = curName
      break
  }
  if (!isPresetName) {
    result = result.charAt(0).toUpperCase() + result.slice(1)
  }
  return result
}

function getVRM0BoneName(name) {
  if (name.includes("Thumb")) {
    if (name.includes("Metacarpal"))
      return name.replace("Metacarpal", "Proximal")
    if (name.includes("Proximal"))
      return name.replace("Proximal", "Intermediate")
  }
  return name
}
export default class VRMExporterv0 {
  parse(
    vrm,
    avatar,
    screenshot,
    rootSpringBones,
    colliderBones,
    scale,
    onDone,
  ) {
    const vrmMeta = convertMetaToVRM0(vrm.meta)
    const humanoid = convertHumanoidToVRM0(vrm.humanoid)

    const materials = vrm.materials
    //const expressionsPreset = {};
    //const expressionCustom = {};
    const blendShapeGroups = []

    // to do, add support to spring bones
    //const springBone = vrm.springBoneManager;
    const exporterInfo = {
      // TODO: データがなくて取得できない
      generator: "UniGLTF-2.0.0",
      version: "2.0",
    }
    // TODO: とりあえず全部ある想定で進める
    if (!avatar) {
      throw new Error("avatar is undefined or null")
    } else if (!humanoid) {
      throw new Error("humanoid is undefined or null")
    } else if (!vrmMeta) {
      throw new Error("meta is undefined or null")
    } else if (!materials) {
      throw new Error("materials is undefined or null")
    }

    // add support to spring bones
    // else if (!springBone) {
    //     throw new Error("springBone is undefined or null");
    // }
    // TODO: name基準で重複除外 これでいいのか？

    const uniqueMaterials = materials
      .filter(
        (material, index, self) =>
          self.findIndex(
            (e) => e.name === material.name.replace(" (Outline)", ""),
          ) === index,
      )
      .map((material) => material)

    const uniqueMaterialNames = uniqueMaterials.map((material) => material.name)

    const icon = screenshot
      ? { name: "icon", imageBitmap: screenshot.image }
      : null // TODO: ない場合もある

    const mainImages = uniqueMaterials
      .filter((material) => material.map)
      .map((material) => {
        if (!material.map) throw new Error(material.name + " map is null")
        return { name: material.name, imageBitmap: material.map.image }
      })
    const shadeImages = uniqueMaterials
      .filter((material) => material.userData.shadeTexture)
      .map((material) => {
        if (!material.userData.shadeTexture)
          throw new Error(material.userData.shadeTexture + " map is null")
        return {
          name: material.name + "_shade",
          imageBitmap: material.userData.shadeTexture.image,
        }
      })
    const ormImages = uniqueMaterials
      .filter((material) => material.roughnessMap)
      .map((material) => {
        if (!material.roughnessMap) return null
        return {
          name: material.name + "_orm",
          imageBitmap: material.roughnessMap.image,
        }
      })

    const normalImages = uniqueMaterials
      .filter((material) => material.roughnessMap)
      .map((material) => {
        if (!material.normalMap) return null
        return {
          name: material.name + "_normal",
          imageBitmap: material.normalMap.image,
        }
      })
    const images = [
      ...mainImages,
      ...shadeImages,
      ...ormImages,
      ...normalImages,
    ].filter((element) => element !== null)
    const outputImages = toOutputImages(images, icon)
    const outputSamplers = toOutputSamplers(outputImages)
    const outputTextures = toOutputTextures(outputImages)
    const outputMaterials = toOutputMaterials(uniqueMaterials, images)
    const rootNode = avatar.children.filter(
      (child) =>
        child.children.length > 0 &&
        child.children[0].type === VRMObjectType.Bone,
    )[0]
    const nodes = getNodes(rootNode).filter(
      (node) => node.name !== SPRINGBONE_COLLIDER_NAME,
    )
    const nodeNames = nodes.map((node) => node.name)
    const outputNodes = nodes.map((node) => {
      return {
        children: node.children
          .filter((childNode) => childNode.name !== SPRINGBONE_COLLIDER_NAME)
          .map((childNode) => nodeNames.indexOf(childNode.name)),
        name: node.name,
        rotation: [
          node.quaternion.x,
          node.quaternion.y,
          node.quaternion.z,
          node.quaternion.w,
        ],
        scale: [node.scale.x, node.scale.y, node.scale.z],
        translation: [node.position.x, node.position.y, node.position.z],
      }
    })
    const outputAccessors = []
    const meshes = avatar.children.filter(
      (child) =>
        child.type === VRMObjectType.Group ||
        child.type === VRMObjectType.SkinnedMesh,
    )
    const meshDatas = []

    meshes.forEach((object) => {
      const mesh =
        object.type === VRMObjectType.Group ? object.children[0] : object
      const attributes = mesh.geometry.attributes
      const positionAttribute = new MeshData(
        attributes.position,
        WEBGL_CONST.FLOAT,
        MeshDataType.POSITION,
        AccessorsType.VEC3,
        mesh.name,
        undefined,
      )
      meshDatas.push(positionAttribute)
      const meshDataIndex = meshDatas.length - 1

      const normalAttribute = new MeshData(
        attributes.normal,
        WEBGL_CONST.FLOAT,
        MeshDataType.NORMAL,
        AccessorsType.VEC3,
        mesh.name,
        undefined,
      )
      meshDatas.push(normalAttribute)

      meshDatas.push(
        new MeshData(
          attributes.uv,
          WEBGL_CONST.FLOAT,
          MeshDataType.UV,
          AccessorsType.VEC2,
          mesh.name,
          undefined,
        ),
      )
      meshDatas.push(
        new MeshData(
          attributes.skinWeight,
          WEBGL_CONST.FLOAT,
          MeshDataType.SKIN_WEIGHT,
          AccessorsType.VEC4,
          mesh.name,
          undefined,
        ),
      )
      meshDatas.push(
        new MeshData(
          attributes.skinIndex,
          WEBGL_CONST.UNSIGNED_SHORT,
          MeshDataType.SKIN_INDEX,
          AccessorsType.VEC4,
          mesh.name,
          undefined,
        ),
      )
      const subMeshes =
        object.type === VRMObjectType.Group
          ? object.children.map((child) => child)
          : [object]
      subMeshes.forEach((subMesh) => {
        if (!subMesh.geometry.index) {
          throw new Error(subMesh.name + " geometry.index is null")
        }
        meshDatas.push(
          new MeshData(
            subMesh.geometry.index,
            WEBGL_CONST.UNSIGNED_INT,
            MeshDataType.INDEX,
            AccessorsType.SCALAR,
            mesh.name,
            subMesh.name,
          ),
        )
      })
      // TODO: とりあえずundefiendは例外スロー
      if (!mesh.morphTargetDictionary) {
        mesh.morphTargetDictionary = {}
        mesh.morphTargetInfluences = []
        mesh.geometry.morphAttributes = {}
        mesh.updateMorphTargets()
        // throw new Error(mesh.name + " morphTargetDictionary is null");
      }

      mesh.geometry.userData.targetNames = []
      console.warn(
        "taking only mesh 0 for morph targets now, take the correct mesh",
      )
      for (const prop in vrm.expressionManager.expressionMap) {
        const expression = vrm.expressionManager.expressionMap[prop]
        const morphTargetBinds = expression._binds.map((obj) => ({
          mesh: 0,
          index: obj.index,
          weight: obj.weight * 100,
        }))
        //only add those that have connected binds
        if (morphTargetBinds.length > 0) {
          let isPreset = false
          for (const presetName in VRMExpressionPresetName) {
            if (
              prop === VRMExpressionPresetName[presetName] &&
              prop !== "surprised"
            ) {
              blendShapeGroups.push({
                name: getVRM0BlendshapeName(prop, false),
                presetName: getVRM0BlendshapeName(prop, true),
                binds: morphTargetBinds,
                isBinary: expression.isBinary,
                materialValue: [],
              })
              isPreset = true
              break
            }
          }
          if (isPreset === false) {
            blendShapeGroups.push({
              name: prop,
              presetName: "unknown",
              binds: morphTargetBinds,
              isBinary: expression.isBinary,
            })
          }
        }

        // to do, material target binds, and texture transform binds
      }

      const getMorphData = (
        attributeData,
        prop,
        meshDataType,
        baseAttribute,
      ) => {
        const nonZeroIndices = []
        const nonZeroValues = []
        // Step 1: Get Zero Elements
        for (let i = 0; i < attributeData.length; i += 3) {
          const x = attributeData[i]
          const y = attributeData[i + 1]
          const z = attributeData[i + 2]

          // Check if any of the x, y, or z values is non-zero
          if (x !== 0 || y !== 0 || z !== 0) {
            nonZeroIndices.push(i / 3) // Push the index of the position, not the index in the array
            nonZeroValues.push(x, y, z)
          }
        }
        if (nonZeroIndices.length > 0) {
          // Step 2: Calculate padding
          const originalLength = nonZeroIndices.length
          const remainder = originalLength % 4
          const padding = remainder === 0 ? 0 : 4 - remainder

          // Step 3: Add padding if needed
          if (padding > 0) {
            for (let i = 0; i < padding; i++) {
              nonZeroIndices.push(0) // Add dummy indices for padding
              nonZeroValues.push(0, 0, 0)
            }
          }

          // Step 3: Create sparse data
          const sparseData = {
            targetMeshDataIndex: meshDataIndex,
            count: nonZeroIndices.length, // Total number of position elements
            indices: new Uint32Array(nonZeroIndices),
            values: new Float32Array(nonZeroValues),
          }
          // Step 4: Create MeshData
          meshDatas.push(
            new MeshData(
              baseAttribute,
              WEBGL_CONST.FLOAT,
              meshDataType,
              AccessorsType.VEC3,
              mesh.name,
              BLENDSHAPE_PREFIX + prop,
              sparseData,
            ),
          )
        }
      }

      for (const prop in mesh.morphTargetDictionary) {
        mesh.geometry.userData.targetNames.push(prop)
        const morphIndex = mesh.morphTargetDictionary[prop]
        const morphAttribute = mesh.geometry.morphAttributes

        getMorphData(
          morphAttribute.position[morphIndex].array,
          prop,
          MeshDataType.BLEND_POSITION,
          attributes.position,
        )

        if (morphAttribute.normal)
          getMorphData(
            morphAttribute.normal[morphIndex].array,
            prop,
            MeshDataType.BLEND_NORMAL,
            attributes.normal,
          )
      }
    })
    // inverseBindMatrices length = 16(matrixの要素数) * 4バイト * ボーン数
    // TODO: とりあえず数合わせでrootNode以外のBoneのmatrixをいれた
    meshes.forEach((object) => {
      const mesh =
        object.type === VRMObjectType.Group ? object.children[0] : object
      const inverseBindMatrices = new Float32Array(
        mesh.skeleton.boneInverses.map((boneInv) => boneInv.elements).flat(),
      )
      meshDatas.push(
        new MeshData(
          new BufferAttribute(inverseBindMatrices, 16),
          WEBGL_CONST.FLOAT,
          MeshDataType.BIND_MATRIX,
          AccessorsType.MAT4,
          mesh.name,
          mesh.name,
        ),
      )
    })
    outputAccessors.push(
      ...meshDatas.map((meshData) => ({
        // bufferView: -1,
        byteOffset: 0,
        componentType: meshData.valueType,
        count: meshData.attribute.count,
        max: meshData.max,
        min: meshData.min,
        normalized: false,
        type: meshData.accessorsType,
      })),
    )
    const outputMeshes = toOutputMeshes(meshes, meshDatas, uniqueMaterialNames)
    // mesh
    meshes.forEach((group, index) => {
      outputNodes.push({
        mesh: index,
        name: group.name,
        rotation: [
          group.quaternion.x,
          group.quaternion.y,
          group.quaternion.z,
          group.quaternion.w,
        ],
        scale: [group.scale.x, group.scale.y, group.scale.z],
        skin: index,
        translation: [group.position.x, group.position.y, group.position.z],
      })
    })
    // secondary
    // const secondaryRootNode = avatar.children.filter((child) => child.name === "secondary")[0];
    // outputNodes.push({
    //     name: secondaryRootNode.name,
    //     rotation: [
    //         secondaryRootNode.quaternion.x,
    //         secondaryRootNode.quaternion.y,
    //         secondaryRootNode.quaternion.z,
    //         secondaryRootNode.quaternion.w,
    //     ],
    //     scale: [
    //         secondaryRootNode.scale.x,
    //         secondaryRootNode.scale.y,
    //         secondaryRootNode.scale.z,
    //     ],
    //     translation: [
    //         secondaryRootNode.position.x,
    //         secondaryRootNode.position.y,
    //         secondaryRootNode.position.z,
    //     ],
    // });
    const outputSkins = toOutputSkins(meshes, meshDatas, nodeNames)

    const vrmHumanoid = {
      humanBones: [],
      //humanBones2: Object.assign(humanoid.humanBones)
    }
    humanoid.humanBones.forEach((bone) => {
      if (nodeNames.indexOf(bone.node.name) != -1)
        vrmHumanoid.humanBones.push({
          bone: getVRM0BoneName(bone.bone), //for thumb
          node: nodeNames.indexOf(bone.node.name),
          useDefaultValues: true,
        })
    })
    //rest of the data is stored in VRMHumanoidDescription
    // const vrmHumanoid = {
    //     armStretch: humanoid.humanDescription.armStretch,
    //     feetSpacing: humanoid.humanDescription.feetSpacing,
    //     hasTranslationDoF: humanoid.humanDescription.hasTranslationDoF,
    //     humanBones: Object.entries(humanoid.humanBones)
    //         .filter((x) => x[1].length > 0)
    //         .map((x) => ({
    //         bone: x[0],
    //         node: nodeNames.indexOf(x[1][0].node.name),
    //         useDefaultValues: true, // TODO:
    //     })),
    //     legStretch: humanoid.humanDescription.legStretch,
    //     lowerArmTwist: humanoid.humanDescription.lowerArmTwist,
    //     lowerLegTwist: humanoid.humanDescription.lowerLegTwist,
    //     upperArmTwist: humanoid.humanDescription.upperArmTwist,
    //     upperLegTwist: humanoid.humanDescription.upperLegTwist,
    // };

    const vrmMaterialProperties = {
      floatProperties: {
        // _BlendMode : 0,
        // _BumpScale : 1,
        // _CullMode : 0,
        // _Cutoff : 0.5,
        // _DebugMode : 0,
        _DstBlend: 0.5,
        // _IndirectLightIntensity : 0.1,
        // _LightColorAttenuation : 0,
        // _MToonVersion : 38,
        // _OutlineColorMode : 0,
        // _OutlineCullMode : 1,
        // _OutlineLightingMix : 1,
        // _OutlineScaledMaxDistance : 1,
        // _OutlineWidth : 0.079,
        // _OutlineWidthMode : 1,
        // _ReceiveShadowRate : 1,
        // _RimFresnelPower : 1,
        // _RimLift : 0,
        // _RimLightingMix : 0,
        _ShadeShift: 0.5,
        _ShadeToony: 0.5,
        _ShadingGradeRate: 0.5,
        // _SrcBlend : 1,
        // _UvAnimRotation : 0,
        // _UvAnimScrollX : 0,
        // _UvAnimScrollY : 0,
        // _ZWrite : 1
      },
      keywordMap: {
        _NORMALMAP: false,
        MTOON_OUTLINE_COLOR_FIXED: true,
        MTOON_OUTLINE_WIDTH_WORLD: true,
      },
      name: "VRMCombinedMat",
      renderQueue: 2000,
      shader: "VRM/MToon",
      tagMap: {
        RenderType: "Opaque",
      },
      textureProperties: {
        _MainTex: 0,
        _ShadeTexture: 0,
      },
      vectorProperties: {
        _Color: [1, 1, 1, 1],
        _EmissionColor: [0, 0, 0, 1],
        _EmissionMap: [0, 0, 1, 1],
        _MainTex: [0, 0, 1, 1],
        _OutlineColor: [0, 0, 0, 1],
        _OutlineWidthTexture: [0, 0, 1, 1],
        _ReceiveShadowTexture: [0, 0, 1, 1],
        _RimColor: [0, 0, 0, 1],
        _RimTexture: [0, 0, 1, 1],
        _ShadeColor: [0.9, 0.9, 0.9, 1],
        // _ShadeTexture : [0, 0, 1, 1],
        // _ShadingGradeTexture : [0, 0, 1, 1],
        // _SphereAdd : [0, 0, 1, 1],
        // _UvAnimMaskTexture : [0, 0, 1, 1]
      },
    }

    const stdMaterialProperties = {
      name: "STDCombinedMat",
      shader: "VRM_USE_GLTFSHADER",
    }

    const materialProperties = []
    uniqueMaterials.forEach((mat) => {
      if (mat.type == "ShaderMaterial") {
        materialProperties.push(
          materialProperties.push(Object.assign({}, vrmMaterialProperties)),
        )
      } else {
        materialProperties.push(
          materialProperties.push(Object.assign({}, stdMaterialProperties)),
        )
      }
    })
    //const outputVrmMeta = ToOutputVRMMeta(vrmMeta, icon, outputImages);
    const outputVrmMeta = vrmMeta

    const rootSpringBonesIndexes = []
    rootSpringBones.forEach((rootSpringBone) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.name === rootSpringBone.name) {
          rootSpringBonesIndexes.push(i)
          break
        }
      }
    })

    // should be fetched from rootSpringBonesIndexes instead
    const colliderGroups = []

    const skeleton = meshes.find((mesh) => mesh.isSkinnedMesh)?.skeleton || null

    //current method: were saving in userData the values that we want to store,
    for (let i = 0; i < skeleton.bones.length; i++) {
      const bn = skeleton.bones[i]
      if (bn.userData.VRMcolliders) {
        // get the node value here
        const colliderGroup = {
          node: nodeNames.indexOf(bn.name),
          colliders: [],
          name: bn.name,
        }
        bn.userData.VRMcolliders.forEach((collider) => {
          const sphere = collider.sphere
          colliderGroup.colliders.push({
            radius: sphere.radius * scale,
            offset: {
              x: sphere.offset[0] * scale,
              y: sphere.offset[1] * scale,
              z: sphere.offset[2] * scale,
            },
          })
        })
        colliderGroups.push(colliderGroup)
      }
    }
    console.log("COLLIDER GROUPS", colliderGroups)

    const findBoneIndex = (boneName) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.name === boneName) {
          return i
        }
      }
      return -1
    }

    const boneGroups = []
    rootSpringBones.forEach((springBone) => {
      //const boneIndices = findBoneIndices(springBone.name);
      const boneIndex = findBoneIndex(springBone.name)
      if (boneIndex === -1) {
        console.warn(
          "Spring bone " +
            springBone.name +
            " was removed during cleanup process. Skipping.",
        )
        return // Skip to the next iteration
      }
      // get the collider group indices
      const colliderIndices = []
      springBone.colliderGroups.forEach((colliderGroup) => {
        const springCollider = colliderGroup.colliders[0]
        // sometimes there are no colliders defined in collidersGroup
        if (springCollider != null) {
          const springParent = springCollider.parent
          const ind = colliderGroups.findIndex(
            (group) => group.name === springParent.name,
          )
          if (ind != -1) {
            if (!colliderIndices.includes(ind)) colliderIndices.push(ind)
          } else {
            console.warn(
              "No collider group for bone name: ",
              springParent.name + " was found",
            )
          }
        } else {
          console.log(
            "No colliders definition were present in vrm file file for: ",
            springBone.name + " spring bones",
          )
        }
      })

      let centerIndex = findBoneIndex(springBone.center?.name)
      if (centerIndex == -1)
        console.warn("no center bone for spring bone " + springBone.name)
      // springBone: bone:boneObject, center:boneObject, string:name, array:colliderGroup, settings:object,
      const settings = springBone.settings

      // FIX!!

      boneGroups.push({
        bones: [boneIndex],
        center: centerIndex,
        colliderGroups: colliderIndices,
        dragForce: settings.dragForce,
        gravityDir: {
          x: settings.gravityDir.x,
          y: settings.gravityDir.y,
          z: settings.gravityDir.z,
        },
        gravityPower: settings.gravityPower,
        hitRadius: settings.hitRadius,
        stiffiness: settings.stiffness, // for some reason specs mark as stiffiness, but loads it as stiffness
      })
    })

    const outputSecondaryAnimation = {
      boneGroups,
      colliderGroups,
    }
    console.log(outputSecondaryAnimation)

    outputVrmMeta.texture = icon ? outputImages.length - 1 : undefined
    const bufferViews = []
    bufferViews.push(
      ...images.map((image) => ({
        buffer: imageBitmap2png(image.imageBitmap),
        type: MeshDataType.IMAGE,
      })),
    )

    // bufferViews.push(...meshDatas.map((data) => ({ buffer: data.buffer, type: data.type })));

    const meshDataBufferViewRelation = []
    meshDatas.forEach((data, i) => {
      if (data.buffer) {
        bufferViews.push({
          buffer: data.buffer,
          typeString: "",
          type: data.type,
        })
      } else if (data.sparse) {
        bufferViews.push({
          buffer: data.sparse.indices,
          typeString: "indices",
          type: data.type,
          count: data.sparse.count,
        })
        bufferViews.push({
          buffer: data.sparse.values,
          typeString: "values",
          type: data.type,
        })
      }
      meshDataBufferViewRelation[i] = bufferViews.length - 1
    })

    if (icon)
      bufferViews.push({
        buffer: imageBitmap2png(icon.imageBitmap),
        type: MeshDataType.IMAGE,
      })
    let bufferOffset = 0
    let imageIndex = 0
    let accessorIndex = 0

    let index = 0
    const outputBufferViews = bufferViews.map((bufferView) => {
      const value = {
        buffer: 0,
        byteLength: bufferView.buffer.byteLength,
        byteOffset: bufferOffset,
        target:
          bufferView.type === MeshDataType.IMAGE ||
          bufferView.type === MeshDataType.BIND_MATRIX
            ? undefined
            : bufferView.type === MeshDataType.INDEX
            ? WEBGL_CONST.ELEMENT_ARRAY_BUFFER
            : WEBGL_CONST.ARRAY_BUFFER, // TODO: だいたいこれだったの　Mesh/indicesだけELEMENT...
      }
      bufferOffset += bufferView.buffer.byteLength
      if (bufferView.type === MeshDataType.IMAGE) {
        outputImages[imageIndex++].bufferView = index
        index++
      } else {
        if (!meshDatas[accessorIndex].sparse) {
          meshDatas[accessorIndex].bufferIndex = index
          // save the bufferview in case we need it for sparse accessors
          outputAccessors[accessorIndex].bufferView = index

          accessorIndex++
          index++
        } else {
          // create the sparse object if it has not been created yet
          if (outputAccessors[accessorIndex].sparse == null) {
            outputAccessors[accessorIndex].sparse = {}
            // const targetBufferView = meshDataBufferViewRelation[meshDatas[accessorIndex].targetMeshDataIndex];
            // outputAccessors[accessorIndex].bufferView = targetBufferView;
            // console.log(outputAccessors[accessorIndex].bufferView);
          }

          // if the buffer view is representing indices of the sparse, save them into an indices object
          // also save count, we can take the length of the indicesw view for this
          if (bufferView.typeString === "indices") {
            outputAccessors[accessorIndex].sparse.count = bufferView.count
            outputAccessors[accessorIndex].sparse[bufferView.typeString] = {
              bufferView: index,
              byteOffset: 0,
              componentType: WEBGL_CONST.UNSIGNED_INT,
            }
          }
          if (bufferView.typeString === "values") {
            outputAccessors[accessorIndex].sparse[bufferView.typeString] = {
              bufferView: index,
              byteOffset: 0,
              // componentType : WEBGL_CONST.FLOAT
            }
          }

          //outputAccessors[accessorIndex].sparse

          // add accessor index only if this is the last sparse type value
          if (bufferView.typeString === "values") {
            accessorIndex++
          }

          // always add to index
          index++
        }
      }
      return value
    })

    const outputScenes = toOutputScenes(avatar, outputNodes)

    fillVRMMissingMetaData(outputVrmMeta)

    const outputData = {
      accessors: outputAccessors,
      asset: exporterInfo,
      buffers: [
        {
          byteLength: bufferOffset,
        },
      ],
      bufferViews: outputBufferViews,
      extensions: {
        VRM: {
          blendShapeMaster: { blendShapeGroups },
          //firstPerson: vrmFirstPerson,
          firstPerson: {
            firstPersonBone: 44,
            firstPersonBoneOffset: new Vector3(),
            lookAtHorizontalInner: {
              curve: [0, 0, 0, 1, 1, 1, 1, 0],
              xRange: 90,
              yRange: 10,
            },
            lookAtHorizontalOuter: {
              curve: [0, 0, 0, 1, 1, 1, 1, 0],
              xRange: 90,
              yRange: 10,
            },
            lookAtTypeName: "Bone",
            lookAtVerticalDown: {
              curve: [0, 0, 0, 1, 1, 1, 1, 0],
              xRange: 90,
              yRange: 10,
            },
            lookAtVerticalUp: {
              curve: [0, 0, 0, 1, 1, 1, 1, 0],
              xRange: 90,
              yRange: 10,
            },
          },
          materialProperties,
          humanoid: vrmHumanoid,
          meta: outputVrmMeta,
          secondaryAnimation: outputSecondaryAnimation,
          specVersion: "0.0",
        },
      },
      extensionsUsed: ["KHR_materials_unlit", "KHR_texture_transform", "VRM"],
      images: outputImages,
      materials: outputMaterials,
      meshes: outputMeshes,
      nodes: outputNodes,
      samplers: outputSamplers,
      scenes: outputScenes,
      skins: outputSkins,
      textures: outputTextures,
    }
    console.log(outputData)
    const jsonChunk = new GlbChunk(
      parseString2Binary(JSON.stringify(outputData, undefined, 2)),
      "JSON",
    )
    const binaryChunk = new GlbChunk(
      concatBinary(bufferViews.map((buf) => buf.buffer)),
      "BIN\x00",
    )
    const fileData = concatBinary([jsonChunk.buffer, binaryChunk.buffer])
    const header = concatBinary([
      parseString2Binary("glTF"),
      parseNumber2Binary(2, 4),
      parseNumber2Binary(fileData.byteLength + 12, 4),
    ])
    onDone(concatBinary([header, fileData]))
  }
}
function fillVRMMissingMetaData(vrmMeta) {
  vrmMeta.title = vrmMeta.title || "Character"
  vrmMeta.version = vrmMeta.version || "1"
  vrmMeta.author = vrmMeta.author || "Anon"
  vrmMeta.contactInformation = vrmMeta.contactInformation || ""
  vrmMeta.reference = vrmMeta.reference || ""
  vrmMeta.allowedUserName = vrmMeta.allowedUserName || "Everyone"
  vrmMeta.violentUssageName = vrmMeta.violentUssageName || "Disallow"
  vrmMeta.sexualUssageName = vrmMeta.sexualUssageName || "Disallow"
  vrmMeta.commercialUssageName = vrmMeta.commercialUssageName || "Disallow"
  vrmMeta.otherPermissionUrl = vrmMeta.otherPermissionUrl || ""
  vrmMeta.licenseName = vrmMeta.licenseName || "Redistribution_Prohibited"
  vrmMeta.otherLicenseUrl = vrmMeta.otherLicenseUrl || ""
}

function radian2Degree(radian) {
  return radian * (180 / Math.PI)
}
function getNodes(parentNode) {
  if (parentNode.children.length <= 0) return [parentNode]
  return [parentNode].concat(
    parentNode.children.map((child) => getNodes(child)).flat(),
  )
}
function imageBitmap2png(image) {
  const canvas = document.createElement("canvas")
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext("2d").drawImage(image, 0, 0)

  // Convert canvas data to PNG format
  const pngUrl = canvas.toDataURL("image/png")

  // Extract base64-encoded data
  const data = atob(pngUrl.split(",")[1])

  // Calculate the necessary padding to ensure the length is a multiple of 4
  const padding = (4 - (data.length % 4)) % 4

  // Create an array with the correct length (padded if needed)
  const array = new ArrayBuffer(data.length + padding)

  // Use a DataView to set Uint8 values
  const view = new DataView(array)

  // Copy the original data to the array
  for (let i = 0; i < data.length; i++) {
    view.setUint8(i, data.charCodeAt(i))
  }

  // Optionally, pad with zeros
  for (let i = data.length; i < data.length + padding; i++) {
    view.setUint8(i, 0)
  }
  return array
}
function parseNumber2Binary(number, size) {
  const buf = new ArrayBuffer(size)
  const view = new DataView(buf)
  view.setUint32(0, number, true)
  return buf
}
function parseString2Binary(str) {
  return new TextEncoder().encode(str).buffer
}
function concatBinary(arrays) {
  let sumLength = 0
  for (let i = 0; i < arrays.length; i++) {
    sumLength += arrays[i].byteLength
  }
  const output = new Uint8Array(sumLength)
  let pos = 0
  for (let i = 0; i < arrays.length; ++i) {
    output.set(new Uint8Array(arrays[i]), pos)
    pos += arrays[i].byteLength
  }
  return output.buffer
}
function parseBinary(attr, componentType) {
  const componentTypeSize = componentType === WEBGL_CONST.UNSIGNED_SHORT ? 2 : 4
  const array = attr.array
  let offset = 0
  const buf = new ArrayBuffer(attr.count * attr.itemSize * componentTypeSize)
  const view = new DataView(buf)
  for (let i = 0; i < attr.count; i++) {
    for (let a = 0; a < attr.itemSize; a++) {
      let value
      if (attr.itemSize > 4) {
        value = array[i * attr.itemSize + a]
      } else {
        if (a === 0) value = attr.getX(i)
        else if (a === 1) value = attr.getY(i)
        else if (a === 2) value = attr.getZ(i)
        else value = attr.getW(i)
      }
      if (componentType === WEBGL_CONST.UNSIGNED_SHORT) {
        view.setUint16(offset, value, true)
      } else if (componentType === WEBGL_CONST.UNSIGNED_INT) {
        view.setUint32(offset, value, true)
      } else {
        view.setFloat32(offset, value, true)
      }
      offset += componentTypeSize
    }
  }
  return buf
}
class GlbChunk {
  constructor(data, type) {
    this.data = data
    this.type = type
    const buf = this.data //, this.type === "JSON" ? 0x20 : 0x00);
    this.buffer = concatBinary([
      parseNumber2Binary(buf.byteLength, 4),
      parseString2Binary(this.type),
      buf,
    ])
  }
  // https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#structured-json-content
  paddingBinary(array, value) {
    const paddedLength = Math.ceil(array.byteLength / 4) * 4
    if (array.byteLength === paddedLength) return array
    const paddedArray = new Uint8Array(paddedLength)
    paddedArray.set(new Uint8Array(array), 0)
    for (let i = array.byteLength; i < paddedLength; i++) {
      paddedArray.set(new Uint8Array(value), i)
    }
    return paddedArray.buffer
  }
}
export class MeshData {
  constructor(
    attribute,
    valueType,
    type,
    accessorsType,
    meshName,
    name,
    sparseData,
  ) {
    this.attribute = attribute
    this.type = type
    this.valueType = valueType
    this.accessorsType = accessorsType
    this.meshName = meshName
    this.name = name

    // Check if sparse data is provided

    if (sparseData) {
      const { indices, values, count, targetMeshDataIndex } = sparseData

      // Convert indices and values to BufferAttributes
      const indicesBufferAttribute = new BufferAttribute(
        indices,
        1, // Set the item size to 1 for indices
      )
      const valuesBufferAttribute = new BufferAttribute(
        values,
        attribute.itemSize, // Use the same item size as the original attribute
      )

      this.targetMeshDataIndex = targetMeshDataIndex

      // pass as attribute
      this.sparse = {
        targetMeshDataIndex,
        count,
        indices: parseBinary(indicesBufferAttribute, WEBGL_CONST.UNSIGNED_INT), // detect if use WEBGL_CONST.UNSIGNED_SHORT or WEBGL_CONST.UNSIGNED_INT
        values: parseBinary(valuesBufferAttribute, WEBGL_CONST.FLOAT),
      }

      this.max =
        type === MeshDataType.POSITION || type === MeshDataType.BLEND_POSITION
          ? [
              Math.max.apply(
                null,
                Array.from(values).filter((_, i) => i % 3 === 0),
              ),
              Math.max.apply(
                null,
                Array.from(values).filter((_, i) => i % 3 === 1),
              ),
              Math.max.apply(
                null,
                Array.from(values).filter((_, i) => i % 3 === 2),
              ),
            ]
          : undefined
      this.min =
        type === MeshDataType.POSITION || type === MeshDataType.BLEND_POSITION
          ? [
              Math.min.apply(
                null,
                Array.from(values).filter((_, i) => i % 3 === 0),
              ),
              Math.min.apply(
                null,
                Array.from(values).filter((_, i) => i % 3 === 1),
              ),
              Math.min.apply(
                null,
                Array.from(values).filter((_, i) => i % 3 === 2),
              ),
            ]
          : undefined
    } else {
      this.buffer = parseBinary(this.attribute, this.valueType)

      this.max =
        type === MeshDataType.POSITION || type === MeshDataType.BLEND_POSITION
          ? [
              Math.max.apply(
                null,
                Array.from(this.attribute.array).filter((_, i) => i % 3 === 0),
              ),
              Math.max.apply(
                null,
                Array.from(this.attribute.array).filter((_, i) => i % 3 === 1),
              ),
              Math.max.apply(
                null,
                Array.from(this.attribute.array).filter((_, i) => i % 3 === 2),
              ),
            ]
          : undefined
      this.min =
        type === MeshDataType.POSITION || type === MeshDataType.BLEND_POSITION
          ? [
              Math.min.apply(
                null,
                Array.from(this.attribute.array).filter((_, i) => i % 3 === 0),
              ),
              Math.min.apply(
                null,
                Array.from(this.attribute.array).filter((_, i) => i % 3 === 1),
              ),
              Math.min.apply(
                null,
                Array.from(this.attribute.array).filter((_, i) => i % 3 === 2),
              ),
            ]
          : undefined
    }
  }
}
var MaterialType
;(function (MaterialType) {
  MaterialType["MeshBasicMaterial"] = "MeshBasicMaterial"
  MaterialType["MeshStandardMaterial"] = "MeshStandardMaterial"
  MaterialType["MToonMaterial"] = "MToonMaterial"
})(MaterialType || (MaterialType = {}))
var AccessorsType
;(function (AccessorsType) {
  AccessorsType["SCALAR"] = "SCALAR"
  AccessorsType["VEC2"] = "VEC2"
  AccessorsType["VEC3"] = "VEC3"
  AccessorsType["VEC4"] = "VEC4"
  AccessorsType["MAT4"] = "MAT4"
})(AccessorsType || (AccessorsType = {}))
var MeshDataType
;(function (MeshDataType) {
  MeshDataType["POSITION"] = "POSITION"
  MeshDataType["NORMAL"] = "NORMAL"
  MeshDataType["UV"] = "UV"
  MeshDataType["INDEX"] = "INDEX"
  MeshDataType["SKIN_WEIGHT"] = "SKIN_WEIGHT"
  MeshDataType["SKIN_INDEX"] = "SKIN_INDEX"
  MeshDataType["BLEND_POSITION"] = "BLEND_POSITION"
  MeshDataType["BLEND_NORMAL"] = "BLEND_NORMAL"
  MeshDataType["BIND_MATRIX"] = "BIND_MATRIX"
  MeshDataType["IMAGE"] = "IMAGE"
})(MeshDataType || (MeshDataType = {}))
var VRMObjectType
;(function (VRMObjectType) {
  VRMObjectType["Group"] = "Group"
  VRMObjectType["SkinnedMesh"] = "SkinnedMesh"
  VRMObjectType["Object3D"] = "Object3D"
  VRMObjectType["Bone"] = "Bone"
})(VRMObjectType || (VRMObjectType = {}))
const toOutputMeshes = (meshes, meshDatas, uniqueMaterialNames) => {
  return meshes.map((object) => {
    const mesh =
      object.type === VRMObjectType.Group ? object.children[0] : object
    const subMeshes =
      object.type === VRMObjectType.Group
        ? object.children.map((child) => child)
        : [object]
    return {
      // extras: {
      //   targetNames: mesh.geometry.userData.targetNames,
      // },
      name: object.name,
      primitives: subMeshes.map((subMesh) => {
        const meshTypes = meshDatas.map((data) =>
          data.meshName === mesh.name ? data.type : null,
        )
        const materialName = Array.isArray(subMesh.material)
          ? subMesh.material[0].name
          : subMesh.material.name
        return {
          attributes: {
            JOINTS_0: meshTypes.indexOf(MeshDataType.SKIN_INDEX),
            NORMAL: meshTypes.indexOf(MeshDataType.NORMAL),
            POSITION: meshTypes.indexOf(MeshDataType.POSITION),
            TEXCOORD_0: meshTypes.indexOf(MeshDataType.UV),
            WEIGHTS_0: meshTypes.indexOf(MeshDataType.SKIN_WEIGHT),
          },
          extras: {
            targetNames: subMesh.geometry.userData.targetNames,
          },
          indices: meshDatas
            .map((data) =>
              data.type === MeshDataType.INDEX && data.meshName === mesh.name
                ? data.name
                : null,
            )
            .indexOf(subMesh.name),
          material: uniqueMaterialNames.indexOf(materialName),
          mode: 4,
          targets: mesh.geometry.userData.targetNames
            ? mesh.geometry.userData.targetNames.map((targetName) => {
                const normalIndex = meshDatas
                  .map((data) =>
                    data.type === MeshDataType.BLEND_NORMAL &&
                    data.meshName === mesh.name
                      ? data.name
                      : null,
                  )
                  .indexOf(BLENDSHAPE_PREFIX + targetName)

                const positionIndex = meshDatas
                  .map((data) =>
                    data.type === MeshDataType.BLEND_POSITION &&
                    data.meshName === mesh.name
                      ? data.name
                      : null,
                  )
                  .indexOf(BLENDSHAPE_PREFIX + targetName)

                const result = {}
                if (positionIndex !== -1) result.POSITION = positionIndex
                if (normalIndex !== -1) result.NORMAL = normalIndex
                // Use the indices or handle the case when they are -1
                return result
              })
            : undefined,
        }
      }),
    }
  })
}
const toOutputSkins = (meshes, meshDatas, nodeNames) => {
  return meshes.map((object) => {
    const mesh =
      object.type === VRMObjectType.Group ? object.children[0] : object
    return {
      inverseBindMatrices: meshDatas
        .map((data) =>
          data.type === MeshDataType.BIND_MATRIX ? data.meshName : null,
        )
        .indexOf(mesh.name),
      joints: mesh.skeleton.bones
        .map((bone) => nodeNames.indexOf(bone.name))
        .filter((index) => index !== -1),
      skeleton: nodeNames.indexOf(mesh.skeleton.bones[0].name),
    }
  })
}
const toOutputMaterials = (uniqueMaterials, images) => {
  return uniqueMaterials.map((material) => {
    let baseColor
    let VRMC_materials_mtoon = null

    material = material.userData.vrmMaterial
      ? material.userData.vrmMaterial
      : material
    if (material.type === "ShaderMaterial") {
      //VRMC_materials_mtoon = material.userData.gltfExtensions.VRMC_materials_mtoon;
      VRMC_materials_mtoon = {}
      VRMC_materials_mtoon.shadeMultiplyTexture = {
        index: images
          .map((image) => image.name)
          .indexOf(material.uniforms.shadeMultiplyTexture.name),
      }
      const mtoonMaterial = material
      baseColor = mtoonMaterial.color ? [1, 1, 1, 1] : undefined
    } else {
      const otherMaterial = material
      baseColor = otherMaterial.color
        ? [
            otherMaterial.color.r,
            otherMaterial.color.g,
            otherMaterial.color.b,
            1, // TODO:
          ]
        : undefined
    }
    let baseTxrIndex = -1
    if (material.map)
      baseTxrIndex = images.map((image) => image.name).indexOf(material.name)
    else if (material.uniforms) {
      if (material.uniforms.map) {
        baseTxrIndex = images
          .map((image) => image.name)
          .indexOf(material.uniforms.map.name)
      }
    }

    let metalicRoughnessIndex = -1
    if (material.roughnessMap)
      metalicRoughnessIndex = images
        .map((image) => image.name)
        .indexOf(material.name + "_orm")

    let normalTextureIndex = -1
    if (material.normalMap)
      normalTextureIndex = images
        .map((image) => image.name)
        .indexOf(material.name + "_normal")

    const baseTexture =
      baseTxrIndex >= 0
        ? {
            extensions: {
              KHR_texture_transform: {
                offset: [0, 0],
                scale: [1, 1],
              },
            },
            index: baseTxrIndex,
            texCoord: 0, // TODO:
          }
        : undefined

    const pbrMetallicRoughness = {
      baseColorFactor: baseColor,
      baseColorTexture: baseTexture,
    }

    const metalRoughTexture =
      metalicRoughnessIndex >= 0
        ? {
            index: metalicRoughnessIndex,
            texCoord: 0, // TODO:
          }
        : undefined

    const normalMapTexture =
      normalTextureIndex >= 0
        ? {
            index: normalTextureIndex,
            texCoord: 0,
          }
        : undefined

    if (metalRoughTexture) {
      pbrMetallicRoughness.metallicRoughnessTexture = metalRoughTexture
    } else {
      const metallicFactor = (() => {
        switch (material.type) {
          case MaterialType.MeshStandardMaterial:
            return material.metalness
          case MaterialType.MeshBasicMaterial:
            return 0
          default:
            return 0
        }
      })()
      const roughnessFactor = (() => {
        switch (material.type) {
          case MaterialType.MeshStandardMaterial:
            return material.roughness
          case MaterialType.MeshBasicMaterial:
            return 0.9
          default:
            return 0.9
        }
      })()

      pbrMetallicRoughness.metallicFactor = metallicFactor
      pbrMetallicRoughness.roughnessFactor = roughnessFactor
    }

    const parseMaterial = {
      alphaCutoff: material.alphaTest > 0 ? material.alphaTest : undefined,
      alphaMode: material.transparent
        ? "BLEND"
        : material.alphaTest > 0
        ? "MASK"
        : "OPAQUE",
      doubleSided: material.side === 2,
      extensions:
        material.type === "ShaderMaterial"
          ? {
              KHR_materials_unlit: {}, // TODO:
              VRMC_materials_mtoon,
            }
          : undefined,
      name: material.name,
      pbrMetallicRoughness,
    }
    if (normalMapTexture) {
      parseMaterial.normalTexture = normalMapTexture
    }
    return parseMaterial
  })
}
const toOutputImages = (images, icon) => {
  return (icon ? images.concat(icon) : images)
    .filter((image) => image && image.imageBitmap)
    .map((image) => ({
      bufferView: -1,
      mimeType: "image/png",
      name: image.name, // TODO: 取得できないので仮のテクスチャ名としてマテリアル名を入れた
    }))
}
const toOutputSamplers = (outputImages) => {
  return outputImages.map(() => ({
    magFilter: WEBGL_CONST.LINEAR,
    minFilter: WEBGL_CONST.LINEAR,
    wrapS: WEBGL_CONST.REPEAT,
    wrapT: WEBGL_CONST.REPEAT, // TODO: だいたいこれだった
  }))
}
const toOutputTextures = (outputImages) => {
  return outputImages.map((_, index) => ({
    sampler: 0,
    source: index, // TODO: 全パターンでindexなのか不明
  }))
}
const toOutputScenes = (avatar, outputNodes) => {
  const nodeNames = outputNodes.map((node) => node.name)
  return [
    {
      nodes: avatar.children
        .filter(
          (child) =>
            child.type === VRMObjectType.Object3D ||
            child.type === VRMObjectType.SkinnedMesh ||
            child.type === VRMObjectType.Group ||
            child.type === VRMObjectType.Bone,
        )
        .map((x) => nodeNames.indexOf(x.name)),
    },
  ]
}
const toOutputSecondaryAnimation = (springBone, nodeNames) => {
  return {
    boneGroups:
      springBone.springBoneGroupList[0] &&
      springBone.springBoneGroupList[0].length > 0
        ? springBone.springBoneGroupList.map((group) => ({
            bones: group.map((e) => nodeNames.indexOf(e.bone.name)),
            center: group[0].center
              ? nodeNames.indexOf(group[0].center.name) // TODO: nullになっていて実際のデータはわからん
              : -1,
            colliderGroups: springBone.colliderGroups.map((_, index) => index),
            dragForce: group[0].dragForce,
            gravityDir: {
              x: group[0].gravityDir.x,
              y: group[0].gravityDir.y,
              z: group[0].gravityDir.z, // TODO: それっぽいやつをいれた
            },
            gravityPower: group[0].gravityPower,
            hitRadius: group[0].radius,
            stiffiness: group[0].stiffnessForce, // TODO: それっぽいやつをいれた
          }))
        : [
            {
              bones: [],
              center: -1,
              colliderGroups: [],
              dragForce: 0.4,
              gravityDir: {
                x: 0,
                y: -1,
                z: 0,
              },
              gravityPower: 0,
              hitRadius: 0.02,
              stiffiness: 1,
            },
          ],
    colliderGroups: springBone.colliderGroups.map((group) => ({
      colliders: [
        {
          offset: {
            x: group.colliders[0].position.x,
            y: group.colliders[0].position.y,
            z: group.colliders[0].position.z,
          },
          radius: group.colliders[0].geometry.boundingSphere
            ? group.colliders[0].geometry.boundingSphere.radius
            : undefined,
        },
      ],
      node: group.node,
    })),
  }
}
