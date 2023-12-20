import React, { useContext, useEffect } from "react"
import styles from "./Appearance.module.css"
import { ViewMode, ViewContext } from "../context/ViewContext"
import { SceneContext } from "../context/SceneContext"
import CustomButton from "../components/custom-button"
import { LanguageContext } from "../context/LanguageContext"
import { SoundContext } from "../context/SoundContext"
import { AudioContext } from "../context/AudioContext"
import FileDropComponent from "../components/FileDropComponent"
import { getFileNameWithoutExtension } from "../library/utils"
import MenuTitle from "../components/MenuTitle"
import TraitInformation from "../components/TraitInformation"
import { TokenBox } from "../components/token-box/TokenBox"
import JsonAttributes from "../components/JsonAttributes"
import cancel from "../images/cancel.png"

function Appearance() {
  const { isLoading, setViewMode, setIsLoading } = React.useContext(ViewContext)
  const {
    toggleDebugMode,
    characterManager,
    animationManager,
    moveCamera
  } = React.useContext(SceneContext)
  

  const { playSound } = React.useContext(SoundContext)
  const { isMute } = React.useContext(AudioContext)
  const { t } = useContext(LanguageContext)
  

  const back = () => {
    !isMute && playSound('backNextButton');
    characterManager.removeCurrentCharacter();
    characterManager.removeCurrentManifest();
    //resetAvatar()
    setViewMode(ViewMode.CREATE)
  }

  const [jsonSelectionArray, setJsonSelectionArray] = React.useState(null)
  const [traits, setTraits] = React.useState(null)
  const [traitGroupName, setTraitGroupName] = React.useState("")
  const [selectedTrait, setSelectedTrait] = React.useState(null)
  const [selectedVRM, setSelectedVRM] = React.useState(null)
  const [animationName, setAnimationName] = React.useState(animationManager?.getCurrentAnimationName() || "");

  const next = () => {
    !isMute && playSound('backNextButton');
    setViewMode(ViewMode.SAVE);
  }

  const randomize = () => {
    setIsLoading(true);
    setJsonSelectionArray(null);
    characterManager.loadRandomTraits().then(() => {
      setIsLoading(false);
    })
    .catch((error) => {
      setIsLoading(false);
      console.error("Error loading random traits:", error.message);
    });
  }


  const debugMode = () =>{
    toggleDebugMode()
  }

  const handleAnimationDrop = async (file) => {
    const animName = getFileNameWithoutExtension(file.name);
    const path = URL.createObjectURL(file);
    await animationManager.loadAnimation(path, true, "", animName);
    setAnimationName(animationManager.getCurrentAnimationName());
  }

  const handleImageDrop = (file) => {
    if (traitGroupName != ""){
      const path = URL.createObjectURL(file);
      characterManager.loadCustomTexture(traitGroupName, path);
    }
    else{
      console.warn("Please select a group trait first.")
    }
  }
  const handleVRMDrop = (file) =>{
    if (traitGroupName != ""){
      const path = URL.createObjectURL(file);
      characterManager.loadCustomTrait(traitGroupName, path);
    }
    else{
      console.warn("Please select a group trait first.")
    }
  }
  const handleJsonDrop = (files) => {
    const filesArray = Array.from(files);
    const jsonDataArray = [];
    const processFile = (file) => {
      return new Promise((resolve, reject) => {
        if (file && file.name.toLowerCase().endsWith('.json')) {
          const reader = new FileReader();

          // XXX Anata hack to display nft thumbs
          const thumbLocation = `${characterManager.manifestData?.getAssetsDirectory()}/anata/_thumbnails/t_${file.name.split('_')[0]}.jpg`;

          console.log(thumbLocation)
          reader.onload = function (e) {
            try {
              const jsonContent = JSON.parse(e.target.result);
              // XXX Anata hack to display nft thumbs
              jsonContent.thumb = thumbLocation;
              jsonDataArray.push(jsonContent);

              resolve(); // Resolve the promise when processing is complete
            } catch (error) {
              console.error("Error parsing the JSON file:", error);
              reject(error);
            }
          };
          reader.readAsText(file);
        }
      });
    };

    // Use Promise.all to wait for all promises to resolve
    Promise.all(filesArray.map(processFile))
    .then(() => {
      if (jsonDataArray.length > 0){
        // This code will run after all files are processed
        setJsonSelectionArray(jsonDataArray);
        setIsLoading(true);
        characterManager.loadTraitsFromNFTObject(jsonDataArray[0]).then(()=>{
          setIsLoading(false);
        })
      }
    })
    .catch((error) => {
      console.error("Error processing files:", error);
    });
  }

  const handleFilesDrop = async(files) => {
    const file = files[0];
    // Check if the file has the .fbx extension
    if (file && file.name.toLowerCase().endsWith('.fbx')) {
      handleAnimationDrop(file);
    } 
    if (file && (file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg'))) {
      handleImageDrop(file);
    } 
    if (file && file.name.toLowerCase().endsWith('.vrm')) {
      handleVRMDrop(file);
    } 
    if (file && file.name.toLowerCase().endsWith('.json')) {
      handleJsonDrop(files);
    } 
  };

  const selectTraitGroup = (traitGroup) => {
    !isMute && playSound('optionClick');
    if (traitGroupName !== traitGroup.trait){
      setTraits(characterManager.getTraits(traitGroup.trait));
      setTraitGroupName(traitGroup.trait);
      setSelectedTrait(characterManager.getCurrentTraitData(traitGroup.trait));
      setSelectedVRM(characterManager.getCurrentTraitVRM(traitGroup.trait))
      moveCamera({ targetY: traitGroup.cameraTarget.height, distance: traitGroup.cameraTarget.distance})
    }
    else{
      setTraits(null);
      setTraitGroupName("");
      setSelectedTrait(null);
      moveCamera({ targetY: 0.8, distance: 3.2 })
    }
  }


  const uploadTrait = async() =>{
    var input = document.createElement('input');
    input.type = 'file';
    input.accept=".vrm"

    input.onchange = e => { 
      var file = e.target.files[0]; 
      if (file.name.endsWith(".vrm")){
        const url = URL.createObjectURL(file);
        characterManager.loadCustomTrait(traitGroupName,url)
        setSelectedTrait(null);
      }
    }
    input.click();
  }

  return (
    <div className={styles.container}>
      <div className={`loadingIndicator ${isLoading ? "active" : ""}`}>
        <img className={"rotate"} src="ui/loading.svg" />
      </div>
      <div className={"sectionTitle"}>{t("pageTitles.chooseAppearance")}</div>
      <FileDropComponent 
         onFilesDrop={handleFilesDrop}
      />
      {/* Main Menu section */}
      <div className={styles["sideMenu"]}>
        <MenuTitle title="Appearance" left={20}/>
        <div className={styles["bottomLine"]} />
        <div className={styles["scrollContainer"]}>
          <div className={styles["editor-container"]}>
            {
              characterManager.getGroupTraits().map((traitGroup, index) => (
                <div key={"options_" + index} className={styles["editorButton"]}>
                  <TokenBox
                    size={56}
                    icon={ traitGroup.fullIconSvg }
                    rarity={traitGroupName !== traitGroup.name ? "none" : "mythic"}
                    onClick={() => {
                      selectTraitGroup(traitGroup)
                    }}
                  />
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Option Selection section */
      !!traits && (
        <div className={styles["selectorContainerPos"]}>
        
          <MenuTitle title={traitGroupName} width={130} left={20}/>
          <div className={styles["bottomLine"]} />
          <div className={styles["scrollContainerOptions"]}>
            <div className={styles["selector-container"]}>
              {/* Null button section */
                !characterManager.isTraitGroupRequired(traitGroupName) ? (
                  <div
                    key={"no-trait"}
                    className={`${styles["selectorButton"]}`}
                    icon={cancel}
                    onClick={() => {
                      characterManager.removeTrait(traitGroupName);
                      setSelectedTrait(null);
                    }}
                  >
                    <TokenBox
                      size={56}
                      icon={cancel}
                      rarity={selectedTrait == null ? "mythic" : "none"}
                    />
                  </div>
                ) : (
                  <></>
                )
              }
              {/* All buttons section */
              traits.map((trait) => {
                let active = trait.id === selectedTrait?.id
                return (
                  <div
                    key={trait.id}
                    className={`${styles["selectorButton"]}`}
                    onClick={() => {
                      // setIsLoading(true);
                      characterManager.loadTrait(trait.traitGroup.trait, trait.id)
                      setSelectedTrait(trait);
                    }}
                  >
                    <TokenBox
                      size={56}
                      icon={trait.fullThumbnail}
                      rarity={active ? "mythic" : "none"}      
                    />
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className={styles["uploadContainer"]}>
            <div 
              className={styles["uploadButton"]}
              onClick={uploadTrait}>
              <div> 
                Upload </div>
            </div>
            
          </div>
        </div>
      )}
      <JsonAttributes jsonSelectionArray={jsonSelectionArray}/>
      <TraitInformation selectedTrait={selectedTrait} selectedVRM={selectedVRM} animationName={animationName} setAnimationName={setAnimationName}
      />
      <div className={styles.buttonContainer}>
        <CustomButton
          theme="light"
          text={t('callToAction.back')}
          size={14}
          className={styles.buttonLeft}
          onClick={back}
        />
        <CustomButton
          theme="light"
          text={t('callToAction.next')}
          size={14}
          className={styles.buttonRight}
          onClick={next}
        />
        <CustomButton
          theme="light"
          text={t('callToAction.randomize')}
          size={14}
          className={styles.buttonCenter}
          onClick={randomize}
        />
        <CustomButton
          theme="light"
          text={"debug"}
          size={14}
          className={styles.buttonCenter}
          onClick={debugMode}
        />
      </div>
    </div>
  )
}

export default Appearance
